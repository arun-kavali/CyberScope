import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import Session

from app.models.evidence import Alert, Event, Asset, UserDirectory
from app.models.intelligence import (
    CorrelationResult,
    Incident,
    IncidentAlert,
    IncidentTimeline,
    RiskScore,
    AlertAnalysis
)

logger = logging.getLogger("cyberscope.correlation")

# Bounded temporal correlation window (2 hours)
CORRELATION_WINDOW_MINUTES = 120
CORRELATION_SCORE_THRESHOLD = 35.0

SEVERITY_RANK = {
    "CRITICAL": 4,
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
    "INFO": 0
}

REVERSE_SEVERITY_RANK = {v: k for k, v in SEVERITY_RANK.items()}

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def extract_indicators_from_payload(raw_payload: Optional[Dict[str, Any]]) -> List[str]:
    """Extracts IP addresses, domain names, file hashes from raw alert payload."""
    if not raw_payload:
        return []
    indicators = []
    for key in ["ip", "source_ip", "destination_ip", "domain", "hash", "md5", "sha256", "file_hash", "ioc"]:
        val = raw_payload.get(key)
        if val and isinstance(val, str) and val.strip():
            indicators.append(val.strip().lower())
    return list(set(indicators))

def extract_mitre_techniques(raw_payload: Optional[Dict[str, Any]]) -> List[str]:
    """Extracts MITRE ATT&CK technique IDs from alert payload."""
    if not raw_payload:
        return []
    techs = []
    val = raw_payload.get("technique_id") or raw_payload.get("mitre_technique") or raw_payload.get("tactic")
    if val and isinstance(val, str):
        techs.append(val.strip().upper())
    return techs

def calculate_correlation_signals(
    target_alert: Alert,
    candidate_alert: Alert
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Evaluates 11 deterministic correlation signals between target_alert and candidate_alert.
    Returns (total_signal_score, list_of_matched_signals).
    """
    matched_signals = []
    total_score = 0.0

    # 1. Same User
    if target_alert.user_context and candidate_alert.user_context:
        if target_alert.user_context.strip().lower() == candidate_alert.user_context.strip().lower():
            weight = 20.0
            total_score += weight
            matched_signals.append({
                "signal_type": "same_user",
                "weight": weight,
                "detail": f"Both alerts reference user '{target_alert.user_context}'"
            })

    # 2. Same Asset
    if target_alert.asset_context and candidate_alert.asset_context:
        if target_alert.asset_context.strip().lower() == candidate_alert.asset_context.strip().lower():
            weight = 20.0
            total_score += weight
            matched_signals.append({
                "signal_type": "same_asset",
                "weight": weight,
                "detail": f"Both alerts reference asset '{target_alert.asset_context}'"
            })

    # 3. Same Source IP
    if target_alert.source_ip and candidate_alert.source_ip:
        if target_alert.source_ip.strip() == candidate_alert.source_ip.strip():
            weight = 15.0
            total_score += weight
            matched_signals.append({
                "signal_type": "same_source_ip",
                "weight": weight,
                "detail": f"Both alerts originate from source IP {target_alert.source_ip}"
            })

    # 4. Same Destination IP
    if target_alert.destination_ip and candidate_alert.destination_ip:
        if target_alert.destination_ip.strip() == candidate_alert.destination_ip.strip():
            weight = 15.0
            total_score += weight
            matched_signals.append({
                "signal_type": "same_destination_ip",
                "weight": weight,
                "detail": f"Both alerts target destination IP {target_alert.destination_ip}"
            })

    # 5. Same Hostname / Asset Entity
    t_payload = target_alert.raw_payload or {}
    c_payload = candidate_alert.raw_payload or {}
    t_host = t_payload.get("hostname") or target_alert.asset_context
    c_host = c_payload.get("hostname") or candidate_alert.asset_context
    if t_host and c_host and t_host == c_host and not any(s["signal_type"] == "same_asset" for s in matched_signals):
        weight = 10.0
        total_score += weight
        matched_signals.append({
            "signal_type": "same_hostname",
            "weight": weight,
            "detail": f"Both alerts share hostname '{t_host}'"
        })

    # 6. Same Indicator
    t_iocs = extract_indicators_from_payload(t_payload)
    c_iocs = extract_indicators_from_payload(c_payload)
    common_iocs = set(t_iocs).intersection(set(c_iocs))
    if common_iocs:
        weight = 25.0
        total_score += weight
        matched_signals.append({
            "signal_type": "same_indicator",
            "weight": weight,
            "detail": f"Shared threat indicators identified: {', '.join(common_iocs)}"
        })

    # 7. Same Event Type
    if target_alert.event_type == candidate_alert.event_type:
        weight = 10.0
        total_score += weight
        matched_signals.append({
            "signal_type": "same_event_type",
            "weight": weight,
            "detail": f"Identical event type '{target_alert.event_type}'"
        })

    # 8. Same Event Category
    if target_alert.event_category == candidate_alert.event_category:
        weight = 10.0
        total_score += weight
        matched_signals.append({
            "signal_type": "same_event_category",
            "weight": weight,
            "detail": f"Identical event category '{target_alert.event_category}'"
        })

    # 9. Same Technique
    t_techs = extract_mitre_techniques(t_payload)
    c_techs = extract_mitre_techniques(c_payload)
    common_techs = set(t_techs).intersection(set(c_techs))
    if common_techs:
        weight = 20.0
        total_score += weight
        matched_signals.append({
            "signal_type": "same_technique",
            "weight": weight,
            "detail": f"Shared MITRE ATT&CK technique IDs: {', '.join(common_techs)}"
        })

    # 10. Temporal Proximity (<= 30 minutes)
    time_diff_secs = abs((target_alert.timestamp - candidate_alert.timestamp).total_seconds())
    if time_diff_secs <= 1800: # 30 mins
        weight = 15.0
        total_score += weight
        matched_signals.append({
            "signal_type": "temporal_proximity",
            "weight": weight,
            "detail": f"Occurred within {int(time_diff_secs // 60)} minutes of each other"
        })

    # 11. Meaningful Event Sequence
    # e.g., AUTHENTICATION (failed) -> AUTHENTICATION (successful) or ENDPOINT -> NETWORK / EXFILTRATION
    if (target_alert.event_category == "AUTHENTICATION" and candidate_alert.event_category == "AUTHENTICATION") or \
       (target_alert.event_category in ["ENDPOINT", "EXECUTION"] and candidate_alert.event_category in ["NETWORK", "EXFILTRATION"]):
        weight = 20.0
        total_score += weight
        matched_signals.append({
            "signal_type": "event_sequence",
            "weight": weight,
            "detail": f"Sequential progression observed between '{candidate_alert.event_category}' and '{target_alert.event_category}'"
        })

    return min(100.0, round(total_score, 1)), matched_signals

def generate_incident_number(db: Session) -> str:
    """Generates unique sequential incident number formatted INC-YYYY-XXXX."""
    year = datetime.now(timezone.utc).year
    prefix = f"INC-{year}-"
    
    count = db.scalar(
        select(func.count(Incident.id)).where(Incident.incident_number.like(f"{prefix}%"))
    ) or 0
    
    seq = count + 1
    for _ in range(10):
        num_str = f"{prefix}{seq:04d}"
        exists = db.scalar(select(Incident.id).where(Incident.incident_number == num_str))
        if not exists:
            return num_str
        seq += 1
    return f"{prefix}{uuid.uuid4().hex[:4].upper()}"

def derive_incident_scores(db: Session, alert_ids: List[uuid.UUID]) -> Tuple[str, float, float]:
    """
    Derives deterministic incident severity, risk score, and confidence score from correlated alerts.
    """
    alerts = db.scalars(select(Alert).where(Alert.id.in_(alert_ids))).all()
    if not alerts:
        return "MEDIUM", 50.0, 50.0

    # 1. Max Severity
    max_rank = max((SEVERITY_RANK.get(a.severity, 1) for a in alerts), default=2)
    incident_severity = REVERSE_SEVERITY_RANK.get(max_rank, "MEDIUM")

    # 2. Risk Scores
    risk_records = db.scalars(select(RiskScore).where(RiskScore.alert_id.in_(alert_ids))).all()
    if risk_records:
        max_risk = max((r.score for r in risk_records), default=40.0)
        max_conf = max((r.confidence for r in risk_records), default=50.0)
    else:
        max_risk = 40.0
        max_conf = 50.0

    # Cluster Boost: +5.0 risk per additional alert in cluster (capped at +20)
    cluster_boost = min(20.0, float(len(alert_ids) - 1) * 5.0)
    derived_risk = max(0.0, min(100.0, round(max_risk + cluster_boost, 1)))

    # Evidence Confidence Boost: +3.0 confidence per additional alert (capped at +15)
    conf_boost = min(15.0, float(len(alert_ids) - 1) * 3.0)
    derived_conf = max(0.0, min(100.0, round(max_conf + conf_boost, 1)))

    return incident_severity, derived_risk, derived_conf

def evaluate_alert_correlation(
    db: Session,
    alert: Alert,
    analysis: Optional[AlertAnalysis] = None
) -> Tuple[CorrelationResult, Optional[Incident]]:
    """
    Evaluates correlation for target alert against historical alerts in bounded time window.
    Persists CorrelationResult and creates or updates associated Incident.
    Enforces strict failure isolation.
    """
    try:
        window_start = alert.timestamp - timedelta(minutes=CORRELATION_WINDOW_MINUTES)
        window_end = alert.timestamp + timedelta(minutes=CORRELATION_WINDOW_MINUTES)

        # Query bounded candidate alerts (excluding target alert itself)
        candidates = db.scalars(
            select(Alert).where(
                Alert.id != alert.id,
                Alert.timestamp >= window_start,
                Alert.timestamp <= window_end
            ).order_by(Alert.timestamp.desc()).limit(100)
        ).all()

        correlated_alert_ids: List[uuid.UUID] = [alert.id]
        all_matched_signals: List[Dict[str, Any]] = []
        max_correlation_score = 0.0

        for cand in candidates:
            score, matched = calculate_correlation_signals(alert, cand)
            # Require at least ONE primary entity/indicator/technique match
            has_primary_match = any(
                s["signal_type"] in [
                    "same_user", "same_asset", "same_source_ip", "same_destination_ip",
                    "same_hostname", "same_indicator", "same_technique"
                ] for s in matched
            )
            if has_primary_match and (score >= 20.0 or len(matched) >= 2):
                if cand.id not in correlated_alert_ids:
                    correlated_alert_ids.append(cand.id)
                if score > max_correlation_score:
                    max_correlation_score = score
                for m in matched:
                    if not any(s["signal_type"] == m["signal_type"] and s["detail"] == m["detail"] for s in all_matched_signals):
                        all_matched_signals.append(m)

        # If single alert with no correlated candidates, record baseline correlation
        if len(correlated_alert_ids) == 1:
            max_correlation_score = 0.0

        # Construct structured evidence explanation payload
        signal_types = [s["signal_type"] for s in all_matched_signals]
        if len(correlated_alert_ids) > 1:
            explanation = (
                f"Correlated {len(correlated_alert_ids)} alerts based on matching signals: "
                f"{', '.join(set(signal_types))}. Time window: {CORRELATION_WINDOW_MINUTES} minutes."
            )
        else:
            explanation = "Single isolated alert. No historical correlation criteria met within window."

        correlation_data = {
            "target_alert_id": str(alert.id),
            "correlated_alert_ids": [str(aid) for aid in correlated_alert_ids],
            "correlation_score": max_correlation_score,
            "signals_matched": all_matched_signals,
            "time_window_minutes": CORRELATION_WINDOW_MINUTES,
            "explanation": explanation,
            "summary": explanation
        }

        correlation_rec = CorrelationResult(
            rule_name="CompositeCorrelationEngine",
            score=max_correlation_score,
            correlated_alert_ids=correlation_data,
            description=explanation
        )
        db.add(correlation_rec)
        db.flush()

        # Check if Correlation Strength meets Incident Creation / Update threshold
        incident_record: Optional[Incident] = None
        existing_inc_alert: Optional[IncidentAlert] = None

        if len(correlated_alert_ids) > 1 and max_correlation_score >= CORRELATION_SCORE_THRESHOLD:
            # Check if any correlated alert is already linked to an active Incident (OPEN or IN_PROGRESS)
            existing_inc_alert = db.scalar(
                select(IncidentAlert)
                .join(Incident, IncidentAlert.incident_id == Incident.id)
                .where(
                    IncidentAlert.alert_id.in_(correlated_alert_ids),
                    Incident.status.in_(["OPEN", "IN_PROGRESS"])
                )
            )

            derived_sev, derived_risk, derived_conf = derive_incident_scores(db, correlated_alert_ids)

            if existing_inc_alert:
                # Update existing Incident
                incident_record = db.scalar(select(Incident).where(Incident.id == existing_inc_alert.incident_id))
                if incident_record:
                    incident_record.severity = derived_sev
                    incident_record.risk_score = derived_risk
                    incident_record.confidence_score = derived_conf
                    incident_record.updated_at = utc_now()
                    incident_record.summary = (
                        f"Updated Incident: {len(correlated_alert_ids)} correlated security alerts. "
                        f"Primary context: {alert.user_context or alert.asset_context or alert.event_type}."
                    )

                    # Link new alerts if not already linked
                    for aid in correlated_alert_ids:
                        link_exists = db.scalar(
                            select(IncidentAlert).where(
                                IncidentAlert.incident_id == incident_record.id,
                                IncidentAlert.alert_id == aid
                            )
                        )
                        if not link_exists:
                            db.add(IncidentAlert(incident_id=incident_record.id, alert_id=aid))
                            # Add timeline entry
                            db.add(IncidentTimeline(
                                incident_id=incident_record.id,
                                event_type="CORRELATED_ALERT_ADDED",
                                description=f"Correlated Alert '{alert.alert_code}' ({alert.event_type}) attached to incident."
                            ))
            else:
                # Create New Incident
                inc_num = generate_incident_number(db)
                primary_entity = alert.user_context or alert.asset_context or alert.event_type
                inc_title = f"Correlated Security Incident — {primary_entity}"
                inc_summary = (
                    f"Correlated security incident containing {len(correlated_alert_ids)} alerts. "
                    f"Matched signals: {', '.join(set(signal_types))}."
                )

                incident_record = Incident(
                    incident_number=inc_num,
                    title=inc_title,
                    summary=inc_summary,
                    severity=derived_sev,
                    risk_score=derived_risk,
                    confidence_score=derived_conf,
                    status="OPEN"
                )
                db.add(incident_record)
                db.flush()

                # Add IncidentAlert links
                for aid in correlated_alert_ids:
                    db.add(IncidentAlert(incident_id=incident_record.id, alert_id=aid))

                # Add initial IncidentTimeline entries for correlated alerts
                db.add(IncidentTimeline(
                    incident_id=incident_record.id,
                    event_type="INCIDENT_CREATED",
                    description=f"Incident '{inc_num}' created via deterministic correlation engine."
                ))
                for aid in correlated_alert_ids:
                    al_obj = db.scalar(select(Alert).where(Alert.id == aid))
                    if al_obj:
                        db.add(IncidentTimeline(
                            incident_id=incident_record.id,
                            event_type="ALERT_INGESTED",
                            description=f"Correlated Alert '{al_obj.alert_code}' ({al_obj.event_type}, Severity: {al_obj.severity}) included in cluster.",
                            timestamp=al_obj.timestamp
                        ))

        # Update AlertAnalysis findings if analysis record exists
        if analysis:
            findings = dict(analysis.findings or {})
            findings["correlation_result_id"] = str(correlation_rec.id)
            findings["correlation"] = {
                "score": max_correlation_score,
                "correlated_alert_count": len(correlated_alert_ids),
                "explanation": explanation,
                "signals": all_matched_signals,
                "incident_id": str(incident_record.id) if incident_record else None,
                "incident_number": incident_record.incident_number if incident_record else None
            }
            analysis.findings = findings

        db.commit()
        db.refresh(correlation_rec)
        if incident_record:
            db.refresh(incident_record)

        # Broadcast WebSocket Realtime Events
        try:
            from app.realtime.publisher import (
                publish_correlation_completed,
                publish_incident_created,
                publish_incident_updated
            )
            publish_correlation_completed(correlation_rec, alert)
            if incident_record:
                if existing_inc_alert:
                    publish_incident_updated(incident_record, alert)
                else:
                    publish_incident_created(incident_record, alert)
        except Exception as pe:
            logger.warning(f"Failed to publish correlation/incident WebSocket event: {pe}")

        try:
            from app.services.audit_service import AuditService
            if incident_record:
                if existing_inc_alert:
                    AuditService.log_event(
                        db=db,
                        action="CORRELATION_INCIDENT_UPDATED",
                        actor_user_id=alert.submitted_by_user_id,
                        target_type="INCIDENT",
                        target_id=str(incident_record.id),
                        reason=f"Incident '{incident_record.incident_number}' updated with correlated alert '{alert.alert_code}'",
                        new_state={"incident_number": incident_record.incident_number, "severity": incident_record.severity, "risk_score": float(incident_record.risk_score)}
                    )
                else:
                    AuditService.log_event(
                        db=db,
                        action="CORRELATION_INCIDENT_CREATED",
                        actor_user_id=alert.submitted_by_user_id,
                        target_type="INCIDENT",
                        target_id=str(incident_record.id),
                        reason=f"New Incident '{incident_record.incident_number}' created from correlated alerts",
                        new_state={"incident_number": incident_record.incident_number, "severity": incident_record.severity, "title": incident_record.title}
                    )
        except Exception as audit_err:
            logger.warning(f"Failed to log correlation audit event: {audit_err}")

        return correlation_rec, incident_record

    except Exception as e:
        logger.error(f"Failed to evaluate correlation for alert '{alert.alert_code}': {e}")
        db.rollback()
        raise e
