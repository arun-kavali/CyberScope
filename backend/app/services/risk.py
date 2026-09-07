import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.evidence import Alert, Event, Asset, UserDirectory
from app.models.intelligence import AlertAnalysis, RiskScore, ThreatIndicator

logger = logging.getLogger("cyberscope.risk")

SCORE_VERSION = "1.0"
RISK_DISCLAIMER = (
    "Risk is an analytical prioritization signal. "
    "It does NOT prove compromise, malicious intent, attacker presence, or business impact."
)

def clamp_score(value: float) -> float:
    """Clamps score strictly within [0.0, 100.0] range."""
    return max(0.0, min(100.0, round(float(value), 1)))

def calculate_risk_score(
    alert: Alert,
    analysis: Optional[AlertAnalysis],
    enrichment: Dict[str, Any],
    triggered_rules: List[Dict[str, Any]],
    historical_count: int = 0
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Calculates deterministic Risk Score (0-100) based on observable evidence:
    - Alert Severity base weight
    - Triggered Detection Rules
    - Asset Criticality
    - Privileged User Context
    - Threat Indicator Match
    - Historical Suspicious Activity
    """
    contributors: List[Dict[str, Any]] = []
    base_score = 0.0

    # 1. Alert Severity Base
    severity_map = {
        "CRITICAL": (40.0, "Alert base severity is CRITICAL (+40 pts)"),
        "HIGH": (30.0, "Alert base severity is HIGH (+30 pts)"),
        "MEDIUM": (15.0, "Alert base severity is MEDIUM (+15 pts)"),
        "LOW": (5.0, "Alert base severity is LOW (+5 pts)"),
        "INFO": (0.0, "Alert base severity is INFO (+0 pts)")
    }
    sev_weight, sev_reason = severity_map.get(alert.severity.upper(), (10.0, f"Alert base severity is {alert.severity} (+10 pts)"))
    base_score += sev_weight
    contributors.append({
        "name": "alert_severity",
        "category": "severity",
        "weight": sev_weight,
        "observed": alert.severity,
        "reason": sev_reason,
        "source": "Alert"
    })

    # 2. Triggered Detection Rules
    rule_score = 0.0
    for r in triggered_rules:
        r_sev = (r.get("severity") or "MEDIUM").upper()
        if r_sev == "CRITICAL":
            pts = 20.0
        elif r_sev == "HIGH":
            pts = 15.0
        elif r_sev == "MEDIUM":
            pts = 10.0
        else:
            pts = 5.0
        rule_score += pts
        contributors.append({
            "name": f"detection_rule_{r.get('rule_id')}",
            "category": "rule_trigger",
            "weight": pts,
            "observed": f"{r.get('rule_id')} ({r.get('rule_name')} v{r.get('rule_version')})",
            "reason": f"Triggered rule '{r.get('rule_name')}' with {r_sev} severity (+{pts} pts)",
            "source": r.get("rule_id")
        })
    # Cap total rule contribution at 35 pts to avoid extreme runaway
    rule_score_capped = min(35.0, rule_score)
    base_score += rule_score_capped

    # 3. Asset Criticality
    asset_ctx = enrichment.get("asset", {})
    if asset_ctx.get("context_available"):
        crit = (asset_ctx.get("criticality") or "LOW").upper()
        if crit in ["CRITICAL", "HIGH"]:
            pts = 15.0 if crit == "CRITICAL" else 10.0
            base_score += pts
            contributors.append({
                "name": "asset_criticality",
                "category": "asset",
                "weight": pts,
                "observed": f"{asset_ctx.get('asset_name')} ({crit})",
                "reason": f"Target asset has {crit} criticality rating (+{pts} pts)",
                "source": "AssetDirectory"
            })
        elif crit == "MEDIUM":
            base_score += 5.0
            contributors.append({
                "name": "asset_criticality",
                "category": "asset",
                "weight": 5.0,
                "observed": f"{asset_ctx.get('asset_name')} (MEDIUM)",
                "reason": "Target asset has MEDIUM criticality rating (+5 pts)",
                "source": "AssetDirectory"
            })

    # 4. Privileged User Context
    user_ctx = enrichment.get("user", {})
    if user_ctx.get("context_available") and user_ctx.get("is_privileged"):
        base_score += 15.0
        contributors.append({
            "name": "privileged_user",
            "category": "user",
            "weight": 15.0,
            "observed": f"{user_ctx.get('username')} (Privileged={user_ctx.get('is_privileged')})",
            "reason": f"User '{user_ctx.get('username')}' possesses administrative / privileged credentials (+15 pts)",
            "source": "UserDirectory"
        })

    # 5. Threat Indicator Match
    ti_ctx = enrichment.get("threat_indicator", {})
    if ti_ctx.get("matched"):
        base_score += 15.0
        contributors.append({
            "name": "threat_indicator_match",
            "category": "threat_intel",
            "weight": 15.0,
            "observed": f"{ti_ctx.get('indicator_type')}={ti_ctx.get('matched_value')}",
            "reason": f"Matched local threat indicator ({ti_ctx.get('indicator_type')}={ti_ctx.get('matched_value')}, threat actor: {ti_ctx.get('threat_actor') or 'Unknown'}) (+15 pts)",
            "source": "ThreatIndicators"
        })

    # 6. Historical Activity
    if historical_count > 0:
        hist_pts = min(10.0, float(historical_count * 2.0))
        base_score += hist_pts
        contributors.append({
            "name": "historical_activity",
            "category": "history",
            "weight": hist_pts,
            "observed": f"{historical_count} prior events in 24h",
            "reason": f"Observed {historical_count} prior security alerts/events for this entity in 24h (+{hist_pts} pts)",
            "source": "AlertHistory"
        })

    final_risk = clamp_score(base_score)
    return final_risk, contributors

def calculate_confidence_score(
    alert: Alert,
    analysis: Optional[AlertAnalysis],
    enrichment: Dict[str, Any],
    triggered_rules: List[Dict[str, Any]],
    historical_count: int = 0
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Calculates deterministic Confidence Score (0-100) measuring evidence quality & strength:
    - Base payload completeness
    - Asset & User Context Availability
    - Detection Rules Strength
    - Threat Indicator Match Confirmation
    - Historical Event Chain Availability
    CONFIDENCE MUST NOT EQUAL RISK.
    """
    contributors: List[Dict[str, Any]] = []
    base_confidence = 0.0

    # 1. Base Payload Completeness
    payload = alert.raw_payload or {}
    has_event_type = bool(alert.event_type)
    has_category = bool(alert.event_category)
    has_source = bool(alert.source_id or alert.source_ip or alert.user_context or alert.asset_context)
    has_payload = bool(isinstance(payload, dict) and len(payload) > 0)

    if has_event_type and has_category and has_source and has_payload:
        pts = 35.0
        reason = "Alert contains complete schema attributes and raw event payload (+35 pts)"
    else:
        pts = 20.0
        reason = "Alert contains standard payload attributes (+20 pts)"
    base_confidence += pts
    contributors.append({
        "name": "payload_completeness",
        "category": "evidence",
        "weight": pts,
        "observed": f"Type={alert.event_type}, Category={alert.event_category}",
        "reason": reason,
        "source": "Alert"
    })

    # 2. Context Enrichment Availability
    asset_ctx = enrichment.get("asset", {})
    if asset_ctx.get("context_available"):
        base_confidence += 15.0
        contributors.append({
            "name": "asset_context_available",
            "category": "enrichment",
            "weight": 15.0,
            "observed": asset_ctx.get("asset_name"),
            "reason": "Target asset enriched successfully from AssetDirectory (+15 pts)",
            "source": "AssetDirectory"
        })

    user_ctx = enrichment.get("user", {})
    if user_ctx.get("context_available"):
        base_confidence += 15.0
        contributors.append({
            "name": "user_context_available",
            "category": "enrichment",
            "weight": 15.0,
            "observed": user_ctx.get("username"),
            "reason": "Target user enriched successfully from UserDirectory (+15 pts)",
            "source": "UserDirectory"
        })

    # 3. Detection Rules Strength
    if triggered_rules:
        # Multiple independent rules boost confidence
        rule_cnt = len(triggered_rules)
        rule_pts = 15.0 + min(10.0, (rule_cnt - 1) * 5.0)
        base_confidence += rule_pts
        contributors.append({
            "name": "detection_rules_evidence",
            "category": "detection",
            "weight": rule_pts,
            "observed": f"{rule_cnt} rule(s) triggered",
            "reason": f"{rule_cnt} deterministic detection rule(s) matched event criteria (+{rule_pts} pts)",
            "source": "DetectionEngine"
        })

    # 4. Threat Indicator Match
    ti_ctx = enrichment.get("threat_indicator", {})
    if ti_ctx.get("matched"):
        ti_conf = ti_ctx.get("confidence") or 80.0
        ti_pts = min(10.0, float(ti_conf * 0.1))
        base_confidence += ti_pts
        contributors.append({
            "name": "threat_indicator_confidence",
            "category": "threat_intel",
            "weight": ti_pts,
            "observed": f"TI Confidence={ti_conf}%",
            "reason": f"Matched local threat indicator with {ti_conf}% confidence rating (+{ti_pts} pts)",
            "source": "ThreatIndicators"
        })

    # 5. Supporting Historical Events
    if historical_count > 0:
        hist_pts = 5.0
        base_confidence += hist_pts
        contributors.append({
            "name": "historical_evidence_chain",
            "category": "history",
            "weight": hist_pts,
            "observed": f"{historical_count} historical records",
            "reason": f"Verified supporting event history in 24h window (+5 pts)",
            "source": "AlertHistory"
        })

    final_conf = clamp_score(base_confidence)
    return final_conf, contributors

def calculate_false_positive_likelihood(
    alert: Alert,
    analysis: Optional[AlertAnalysis],
    enrichment: Dict[str, Any],
    triggered_rules: List[Dict[str, Any]],
    historical_count: int = 0
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Calculates deterministic Estimated False-Positive Likelihood (0-100):
    - Benign intent metadata / routine context
    - Lack of triggered detection rules
    - Expected non-privileged context
    - Low asset criticality
    FALSE-POSITIVE LIKELIHOOD MUST NOT EQUAL (100 - RISK).
    """
    contributors: List[Dict[str, Any]] = []
    base_fp = 0.0

    payload = alert.raw_payload or {}
    desc_str = (alert.description or "").lower()
    is_routine = payload.get("is_routine", False) or payload.get("scheduled_maintenance", False) or "test" in desc_str or "routine" in desc_str
    
    # 1. Benign / Routine Intent Metadata
    if is_routine:
        base_fp += 40.0
        contributors.append({
            "name": "routine_maintenance_metadata",
            "category": "intent",
            "weight": 40.0,
            "observed": "Routine/Scheduled activity flag present",
            "reason": "Alert payload or title indicates scheduled maintenance / benign test activity (+40 pts)",
            "source": "Payload"
        })

    # 2. Lack of Triggered Detection Rules
    if not triggered_rules:
        base_fp += 35.0
        contributors.append({
            "name": "zero_rules_triggered",
            "category": "detection",
            "weight": 35.0,
            "observed": "0 rules triggered",
            "reason": "No deterministic detection rules triggered during Phase 9 triage (+35 pts)",
            "source": "DetectionEngine"
        })
    elif len(triggered_rules) == 1 and triggered_rules[0].get("severity") in ["LOW", "INFO"]:
        base_fp += 15.0
        contributors.append({
            "name": "low_severity_single_rule",
            "category": "detection",
            "weight": 15.0,
            "observed": triggered_rules[0].get("rule_id"),
            "reason": "Only a single low-severity detection rule was triggered (+15 pts)",
            "source": "DetectionEngine"
        })

    # 3. Non-Privileged User Context
    user_ctx = enrichment.get("user", {})
    if user_ctx.get("context_available") and not user_ctx.get("is_privileged"):
        base_fp += 15.0
        contributors.append({
            "name": "standard_user_context",
            "category": "user",
            "weight": 15.0,
            "observed": f"{user_ctx.get('username')} (Standard)",
            "reason": "Target user account is a standard, non-privileged account (+15 pts)",
            "source": "UserDirectory"
        })

    # 4. Low Asset Criticality
    asset_ctx = enrichment.get("asset", {})
    if asset_ctx.get("context_available"):
        crit = (asset_ctx.get("criticality") or "LOW").upper()
        if crit in ["LOW", "UNCLASSIFIED"]:
            base_fp += 10.0
            contributors.append({
                "name": "low_asset_criticality",
                "category": "asset",
                "weight": 10.0,
                "observed": crit,
                "reason": "Target asset has LOW criticality rating (+10 pts)",
                "source": "AssetDirectory"
            })
    else:
        # Untracked asset slightly increases FP likelihood due to unknown scope
        base_fp += 5.0
        contributors.append({
            "name": "untracked_asset",
            "category": "asset",
            "weight": 5.0,
            "observed": "Asset context unavailable",
            "reason": "Asset is not listed in critical infrastructure inventory (+5 pts)",
            "source": "AssetDirectory"
        })

    # 5. Low Base Severity
    if alert.severity.upper() in ["LOW", "INFO"]:
        base_fp += 15.0
        contributors.append({
            "name": "low_alert_severity",
            "category": "severity",
            "weight": 15.0,
            "observed": alert.severity,
            "reason": "Original alert severity is LOW or INFO (+15 pts)",
            "source": "Alert"
        })

    final_fp = clamp_score(base_fp)
    return final_fp, contributors

def evaluate_and_persist_risk_scores(
    db: Session,
    alert: Alert,
    analysis: AlertAnalysis
) -> RiskScore:
    """
    Orchestrates Phase 10 Risk, Confidence, and False-Positive Likelihood evaluation and persistence.
    Connects with RiskScore model and updates AlertAnalysis findings.
    Enforces failure isolation: if scoring fails, original alert & analysis remain intact.
    """
    try:
        enrichment = (analysis.analysis_metadata or {}).get("context_enrichment", {})
        triggered_rules = (analysis.findings or {}).get("triggered_rules", [])
        hist_count = len(enrichment.get("history", {}).get("recent_alerts_24h", []))

        # Calculate scores deterministically
        risk_val, risk_contribs = calculate_risk_score(alert, analysis, enrichment, triggered_rules, hist_count)
        conf_val, conf_contribs = calculate_confidence_score(alert, analysis, enrichment, triggered_rules, hist_count)
        fp_val, fp_contribs = calculate_false_positive_likelihood(alert, analysis, enrichment, triggered_rules, hist_count)

        contributors_data = {
            "risk_contributors": risk_contribs,
            "confidence_contributors": conf_contribs,
            "fp_contributors": fp_contribs,
            "score_disclaimer": RISK_DISCLAIMER
        }

        # Check for existing RiskScore record for this alert
        risk_record = db.scalar(select(RiskScore).where(RiskScore.alert_id == alert.id))
        if not risk_record:
            risk_record = RiskScore(
                alert_id=alert.id,
                score=risk_val,
                confidence=conf_val,
                false_positive_likelihood=fp_val,
                contributors=contributors_data,
                version=SCORE_VERSION
            )
            db.add(risk_record)
        else:
            risk_record.score = risk_val
            risk_record.confidence = conf_val
            risk_record.false_positive_likelihood = fp_val
            risk_record.contributors = contributors_data
            risk_record.version = SCORE_VERSION
            risk_record.timestamp = datetime.now(timezone.utc)

        # Update AlertAnalysis findings with score summary for rapid API retrieval
        findings = dict(analysis.findings or {})
        findings["risk_score_id"] = str(risk_record.id)
        findings["risk_score"] = {
            "score": risk_val,
            "confidence": conf_val,
            "false_positive_likelihood": fp_val,
            "version": SCORE_VERSION,
            "disclaimer": RISK_DISCLAIMER,
            "contributors": contributors_data
        }
        analysis.findings = findings

        db.commit()
        db.refresh(risk_record)
        db.refresh(analysis)

        # Publish realtime event
        try:
            from app.realtime.publisher import publish_scores_completed
            publish_scores_completed(risk_record, alert)
        except Exception as pe:
            logger.warning(f"Failed to publish SCORES_COMPLETED event: {pe}")

        return risk_record

    except Exception as e:
        logger.error(f"Failed to evaluate/persist Phase 10 RiskScores for alert '{alert.alert_code}': {e}")
        db.rollback()
        raise e
