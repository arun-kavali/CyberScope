import logging
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.models.identity import Profile
from app.models.evidence import Alert, Event, Asset, UserDirectory, Investigation
from app.models.intelligence import (
    Incident,
    IncidentAlert,
    IncidentTimeline,
    CorrelationResult,
    AlertAnalysis,
    RiskScore,
    AnomalyScore,
    AIIntelligence
)

logger = logging.getLogger("cyberscope.investigation")

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def _get_profile_name(profile: Any) -> str:
    if not profile:
        return "SOC Analyst"
    return getattr(profile, "full_name", None) or getattr(profile, "username", None) or getattr(profile, "email", "SOC Analyst")

def start_incident_investigation(
    db: Session,
    incident_id: uuid.UUID,
    analyst_profile: Profile
) -> Tuple[Investigation, Incident]:
    """
    Starts or retrieves an active investigation for a given incident.
    Transitions incident status from OPEN to IN_PROGRESS.
    Prevents duplicate active investigations for the same incident.
    """
    incident = db.scalar(select(Incident).where(Incident.id == incident_id))
    if not incident:
        raise ValueError(f"Incident '{incident_id}' not found")

    # Check if an active investigation already exists for this incident
    investigation: Optional[Investigation] = None
    if incident.investigation_id:
        investigation = db.scalar(select(Investigation).where(Investigation.id == incident.investigation_id))

    if not investigation:
        # Check if there is an existing investigation linked via summary/case
        investigation = db.scalar(
            select(Investigation).where(
                Investigation.summary.like(f"%Incident {incident.incident_number}%"),
                Investigation.status == "IN_PROGRESS"
            )
        )

    if not investigation:
        investigation = Investigation(
            summary=f"Active SOC Analyst investigation for Incident {incident.incident_number} — {incident.title}",
            status="IN_PROGRESS",
            notes=json.dumps([]),
            created_by_user_id=analyst_profile.id
        )
        db.add(investigation)
        db.flush()

    # Link investigation to incident & update status
    incident.investigation_id = investigation.id
    if incident.status == "OPEN":
        incident.status = "IN_PROGRESS"
    incident.updated_at = utc_now()

    # Add timeline entry
    analyst_name = _get_profile_name(analyst_profile)
    db.add(IncidentTimeline(
        incident_id=incident.id,
        event_type="INVESTIGATION_STARTED",
        description=f"Investigation started by SOC Analyst {analyst_name} ({analyst_profile.email}).",
        actor_profile_id=analyst_profile.id
    ))

    db.commit()
    db.refresh(investigation)
    db.refresh(incident)

    # Publish Realtime Event
    try:
        from app.realtime.publisher import publish_investigation_started
        publish_investigation_started(investigation, incident, analyst_profile)
    except Exception as pe:
        logger.warning(f"Failed to publish INVESTIGATION_STARTED event: {pe}")

    return investigation, incident

def add_investigation_note(
    db: Session,
    incident_id: uuid.UUID,
    note_text: str,
    analyst_profile: Profile
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Adds a timestamped, analyst-attributed investigation note.
    Safely stores notes inside Investigation.notes JSON payload.
    """
    if not note_text or not note_text.strip():
        raise ValueError("Note text cannot be empty.")

    incident = db.scalar(select(Incident).where(Incident.id == incident_id))
    if not incident:
        raise ValueError(f"Incident '{incident_id}' not found")

    # Fetch or create associated investigation
    investigation: Optional[Investigation] = None
    if incident.investigation_id:
        investigation = db.scalar(select(Investigation).where(Investigation.id == incident.investigation_id))

    if not investigation:
        investigation, incident = start_incident_investigation(db, incident_id, analyst_profile)

    # Parse existing notes list
    notes_list: List[Dict[str, Any]] = []
    if investigation.notes:
        try:
            notes_list = json.loads(investigation.notes)
            if not isinstance(notes_list, list):
                notes_list = []
        except Exception:
            notes_list = []

    analyst_name = _get_profile_name(analyst_profile)
    new_note = {
        "id": str(uuid.uuid4()),
        "note": note_text.strip(),
        "analyst_id": str(analyst_profile.id),
        "analyst_name": analyst_name,
        "created_at": utc_now().isoformat()
    }

    notes_list.append(new_note)
    investigation.notes = json.dumps(notes_list)
    investigation.updated_at = utc_now()
    incident.updated_at = utc_now()

    # Record Timeline Entry
    snippet = note_text.strip()[:60] + ("..." if len(note_text.strip()) > 60 else "")
    db.add(IncidentTimeline(
        incident_id=incident.id,
        event_type="INVESTIGATION_NOTE_ADDED",
        description=f"Analyst note added by {analyst_name}: '{snippet}'",
        actor_profile_id=analyst_profile.id
    ))

    db.commit()
    db.refresh(investigation)
    db.refresh(incident)

    # Publish Realtime Event
    try:
        from app.realtime.publisher import publish_investigation_note_added
        publish_investigation_note_added(new_note, incident, analyst_profile)
    except Exception as pe:
        logger.warning(f"Failed to publish INVESTIGATION_NOTE_ADDED event: {pe}")

    return new_note, notes_list

def get_incident_intelligence_summary(
    db: Session,
    incident_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Derives deterministic, evidence-grounded investigation intelligence summary.
    Includes 'What Happened', 'Why Suspicious', 'Potential Impact', full evidence chain,
    notes, and related incidents. Strictly contains NO LLM calls.
    """
    incident = db.scalar(select(Incident).where(Incident.id == incident_id))
    if not incident:
        raise ValueError(f"Incident '{incident_id}' not found")

    # Fetch correlated alerts
    inc_alerts = db.scalars(
        select(IncidentAlert).where(IncidentAlert.incident_id == incident_id).order_by(IncidentAlert.added_at.asc())
    ).all()
    alert_ids = [ia.alert_id for ia in inc_alerts]
    alerts = db.scalars(select(Alert).where(Alert.id.in_(alert_ids))).all() if alert_ids else []

    # 1. What Happened (Deterministic evidence sequence)
    event_types = list(set(a.event_type for a in alerts))
    categories = list(set(a.event_category for a in alerts))
    users = list(set(a.user_context for a in alerts if a.user_context))
    assets = list(set(a.asset_context for a in alerts if a.asset_context))

    what_happened_summary = (
        f"Correlated security incident '{incident.incident_number}' involves {len(alerts)} alert(s) "
        f"across categories [{', '.join(categories) if categories else 'N/A'}]. "
        f"Event types observed: [{', '.join(event_types) if event_types else 'N/A'}]. "
        f"Targeted users: [{', '.join(users) if users else 'None'}]. "
        f"Targeted assets: [{', '.join(assets) if assets else 'None'}]."
    )

    # 2. Why Suspicious (Triggered rules, anomaly Z-scores, risk contributors)
    triggered_rules = []
    anomaly_findings = []
    matched_correlation_signals = []

    for al in alerts:
        analysis = db.scalar(select(AlertAnalysis).where(AlertAnalysis.alert_id == al.id))
        if analysis and analysis.findings:
            tr = analysis.findings.get("triggered_rules", [])
            for r in tr:
                if not any(ex["rule_id"] == r.get("rule_id") for ex in triggered_rules):
                    triggered_rules.append(r)
            
            anom = analysis.findings.get("anomaly_score", {})
            if anom and "anomalous_features" in anom:
                for af in anom["anomalous_features"]:
                    if not any(ex["feature_name"] == af.get("feature_name") for ex in anomaly_findings):
                        anomaly_findings.append(af)

            corr = analysis.findings.get("correlation", {})
            if corr and "signals" in corr:
                for cs in corr["signals"]:
                    if not any(ex["signal_type"] == cs.get("signal_type") and ex["detail"] == cs.get("detail") for ex in matched_correlation_signals):
                        matched_correlation_signals.append(cs)

    why_suspicious_summary = {
        "summary": f"Incident flagged due to {len(triggered_rules)} triggered rule(s) and {len(matched_correlation_signals)} correlation signal(s).",
        "triggered_rules": triggered_rules,
        "anomaly_indicators": anomaly_findings,
        "correlation_signals": matched_correlation_signals
    }

    # 3. Potential Impact (Evidence-grounded, neutral wording)
    source_ips = list(set(a.source_ip for a in alerts if a.source_ip))
    dest_ips = list(set(a.destination_ip for a in alerts if a.destination_ip))

    potential_impact = {
        "summary": "Potential impact based on available evidence:",
        "affected_users": users,
        "affected_assets": assets,
        "source_ips": source_ips,
        "destination_ips": dest_ips,
        "affected_services": list(set(a.event_category for a in alerts)),
        "disclaimer": "Potential impact derived strictly from observed evidence. Does NOT prove business compromise."
    }

    # 4. Evidence Traceability Chain
    evidence_chain = []
    for al in alerts:
        analysis = db.scalar(select(AlertAnalysis).where(AlertAnalysis.alert_id == al.id))
        risk_rec = db.scalar(select(RiskScore).where(RiskScore.alert_id == al.id))
        anom_rec = db.scalar(select(AnomalyScore).where(AnomalyScore.alert_id == al.id))

        evidence_chain.append({
            "alert_id": str(al.id),
            "alert_code": al.alert_code,
            "event_type": al.event_type,
            "severity": al.severity,
            "timestamp": al.timestamp.isoformat() if al.timestamp else None,
            "analysis_id": str(analysis.id) if analysis else None,
            "risk_score_id": str(risk_rec.id) if risk_rec else None,
            "risk_score": float(risk_rec.score) if risk_rec else None,
            "confidence_score": float(risk_rec.confidence) if risk_rec else None,
            "anomaly_score_id": str(anom_rec.id) if anom_rec else None,
            "anomaly_score": float(anom_rec.anomaly_score) if anom_rec else None
        })

    # 5. Analyst Notes
    notes_list: List[Dict[str, Any]] = []
    if incident.investigation_id:
        inv = db.scalar(select(Investigation).where(Investigation.id == incident.investigation_id))
        if inv and inv.notes:
            try:
                notes_list = json.loads(inv.notes)
            except Exception:
                notes_list = []

    # 6. Related Incidents (Sharing same user or asset)
    related_incidents_list = []
    if users or assets:
        related_stmt = (
            select(Incident)
            .join(IncidentAlert, IncidentAlert.incident_id == Incident.id)
            .join(Alert, Alert.id == IncidentAlert.alert_id)
            .where(
                Incident.id != incident_id,
                or_(
                    Alert.user_context.in_(users) if users else False,
                    Alert.asset_context.in_(assets) if assets else False
                )
            ).limit(5)
        )
        rel_incs = db.scalars(related_stmt).all()
        for r_inc in rel_incs:
            if not any(r["id"] == str(r_inc.id) for r in related_incidents_list):
                related_incidents_list.append({
                    "id": str(r_inc.id),
                    "incident_number": r_inc.incident_number,
                    "title": r_inc.title,
                    "severity": r_inc.severity,
                    "status": r_inc.status,
                    "risk_score": float(r_inc.risk_score),
                    "created_at": r_inc.created_at.isoformat() if r_inc.created_at else None
                })

    # Fetch existing AI intelligence if completed
    ai_record = db.query(AIIntelligence).filter(
        AIIntelligence.target_id == incident_id,
        AIIntelligence.status == "COMPLETED"
    ).order_by(AIIntelligence.created_at.desc()).first()

    ai_intelligence_data = None
    if ai_record and ai_record.structured_output:
        ai_intelligence_data = {
            "id": str(ai_record.id),
            "intelligence_type": ai_record.intelligence_type,
            "status": ai_record.status,
            "model_name": ai_record.model_name,
            "prompt_version": ai_record.prompt_version,
            "structured_output": ai_record.structured_output,
            "evidence_references": ai_record.evidence_references,
            "updated_at": ai_record.updated_at.isoformat() if ai_record.updated_at else None
        }

    return {
        "incident_id": str(incident.id),
        "incident_number": incident.incident_number,
        "title": incident.title,
        "severity": incident.severity,
        "status": incident.status,
        "risk_score": float(incident.risk_score),
        "confidence_score": float(incident.confidence_score),
        "investigation_id": str(incident.investigation_id) if incident.investigation_id else None,
        "what_happened": what_happened_summary,
        "why_suspicious": why_suspicious_summary,
        "potential_impact": potential_impact,
        "evidence_chain": evidence_chain,
        "notes": notes_list,
        "related_incidents": related_incidents_list,
        "ai_intelligence": ai_intelligence_data,
        "recommendations_placeholder": "AI intelligence will be available in the next intelligence phase."
    }

