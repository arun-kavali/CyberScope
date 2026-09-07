import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.evidence import Alert
from app.models.intelligence import AlertAnalysis
from app.services.enrichment import enrich_alert_context
from app.services.detection import evaluate_detection_rules, seed_detection_rules_db

logger = logging.getLogger("cyberscope.triage")

def make_json_serializable(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(v) for v in obj]
    return obj

def execute_alert_triage(db: Session, alert: Alert) -> AlertAnalysis:
    """
    Executes the Phase 9 Automatic Alert Triage Pipeline:
    Alert -> Context Enrichment -> Deterministic Detection Rules -> AlertAnalysis Persistence
    Enforces failure isolation: triage errors do not fail or delete the original alert.
    """
    # Ensure detection rules DB definitions are present
    seed_detection_rules_db(db)

    # Fetch existing AlertAnalysis or initialize a new record
    analysis = db.scalar(select(AlertAnalysis).where(AlertAnalysis.alert_id == alert.id))
    if not analysis:
        analysis = AlertAnalysis(
            alert_id=alert.id,
            summary="Automatic triage processing initiated.",
            findings={"triage_status": "PROCESSING", "triggered_rules": []},
            analysis_metadata={"triage_version": "1.0"}
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

    try:
        # 1. Context Enrichment
        enrichment = enrich_alert_context(db, alert)

        # 2. Detection Rule Evaluation
        triggered_rules = evaluate_detection_rules(db, alert, enrichment)

        # 3. Construct Summary & Findings
        rule_names = [f"{r['rule_id']} ({r['rule_name']} v{r['rule_version']})" for r in triggered_rules]
        summary_text = (
            f"Automatic Triage COMPLETED. Triggered {len(triggered_rules)} detection rule(s): "
            f"[{', '.join(rule_names) if rule_names else 'None'}]. "
            f"Context: Asset={'Available' if enrichment.get('asset', {}).get('context_available') else 'Unavailable'}, "
            f"User={'Available' if enrichment.get('user', {}).get('context_available') else 'Unavailable'}."
        )

        findings = {
            "triage_status": "COMPLETED",
            "triggered_rules_count": len(triggered_rules),
            "triggered_rules": triggered_rules,
            "threat_indicator_match": enrichment.get("threat_indicator", {"matched": False}),
            "triage_priority_input": "HIGH" if any(r.get("severity") in ["HIGH", "CRITICAL"] for r in triggered_rules) else alert.severity
        }

        analysis_meta = {
            "triage_version": "1.0",
            "context_enrichment": enrichment,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }

        analysis.summary = summary_text
        analysis.findings = make_json_serializable(findings)
        analysis.analysis_metadata = make_json_serializable(analysis_meta)

        db.commit()
        db.refresh(analysis)

        # 4. Trigger Realtime ANALYSIS_COMPLETED event if publisher available
        try:
            from app.realtime.publisher import publish_analysis_completed
            publish_analysis_completed(analysis, alert)
        except Exception as pe:
            logger.warning(f"Failed to publish ANALYSIS_COMPLETED event: {pe}")

        # 5. Phase 10: Risk, Confidence, and False-Positive Likelihood Scoring
        try:
            from app.services.risk import evaluate_and_persist_risk_scores
            evaluate_and_persist_risk_scores(db, alert, analysis)
        except Exception as se:
            logger.error(f"Failed to evaluate risk scores for alert '{alert.alert_code}': {se}")

        # 6. Phase 11: ML and Statistical Anomaly Analysis
        try:
            from app.services.anomaly import evaluate_and_persist_anomaly
            evaluate_and_persist_anomaly(db, alert, analysis)
        except Exception as ae:
            logger.error(f"Failed to evaluate anomaly scores for alert '{alert.alert_code}': {ae}")

        # 7. Phase 12: Correlation Engine and Incident Creation
        try:
            from app.services.correlation import evaluate_alert_correlation
            evaluate_alert_correlation(db, alert, analysis)
        except Exception as ce:
            logger.error(f"Failed to evaluate correlation for alert '{alert.alert_code}': {ce}")

        return analysis

    except Exception as e:
        logger.error(f"Error during triage processing for alert '{alert.alert_code}': {e}")
        db.rollback()
        # Failure Isolation: Mark analysis as FAILED without deleting original alert
        analysis.summary = f"Automatic triage FAILED: {str(e)}"
        analysis.findings = {"triage_status": "FAILED", "error": str(e), "triggered_rules": []}
        analysis.analysis_metadata = {"triage_version": "1.0", "failed_at": datetime.now(timezone.utc).isoformat()}
        db.commit()
        db.refresh(analysis)
        return analysis
