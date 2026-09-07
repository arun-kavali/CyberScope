import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.evidence import Alert
from app.models.response import DetectionRule

logger = logging.getLogger("cyberscope.detection")

RULE_DEFINITIONS = [
    {
        "rule_id_code": "RUL-001",
        "name": "Failed Login Pattern",
        "version": "1.0",
        "description": "Detects repeated failed authentication attempts within a bounded time window.",
        "rule_type": "AUTHENTICATION"
    },
    {
        "rule_id_code": "RUL-002",
        "name": "Success After Failed Logins",
        "version": "1.0",
        "description": "Detects successful authentication immediately following multiple failed login attempts for the same user or IP.",
        "rule_type": "AUTHENTICATION"
    },
    {
        "rule_id_code": "RUL-003",
        "name": "Impossible Travel",
        "version": "1.0",
        "description": "Detects authentication attempts from geographically distant locations within a physically impossible timeframe.",
        "rule_type": "AUTHENTICATION"
    },
    {
        "rule_id_code": "RUL-004",
        "name": "Privileged Login",
        "version": "1.0",
        "description": "Detects login activity involving administrative, root, or elevated privilege user accounts.",
        "rule_type": "AUTHENTICATION"
    },
    {
        "rule_id_code": "RUL-005",
        "name": "Suspicious Process",
        "version": "1.0",
        "description": "Detects execution of suspicious processes, encoded PowerShell scripts, or malicious binaries on endpoints.",
        "rule_type": "ENDPOINT"
    },
    {
        "rule_id_code": "RUL-006",
        "name": "Bulk Database Extraction",
        "version": "1.0",
        "description": "Detects high-volume database queries or bulk data read operations exceeding normal baseline thresholds.",
        "rule_type": "DATABASE"
    },
    {
        "rule_id_code": "RUL-007",
        "name": "Suspicious DNS Activity",
        "version": "1.0",
        "description": "Detects high-entropy DNS queries, domain generation algorithms (DGA), or DNS tunneling patterns.",
        "rule_type": "NETWORK"
    }
]

def seed_detection_rules_db(db: Session) -> None:
    """
    Ensures the 7 standard detection rule definitions exist in the detection_rules database table.
    """
    try:
        for rdef in RULE_DEFINITIONS:
            rule_obj = db.scalar(select(DetectionRule).where(DetectionRule.name == rdef["name"]))
            if not rule_obj:
                rule_obj = DetectionRule(
                    name=rdef["name"],
                    description=rdef["description"],
                    rule_type=rdef["rule_type"],
                    logic={"rule_id_code": rdef["rule_id_code"], "version": rdef["version"]},
                    enabled=True
                )
                db.add(rule_obj)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Error seeding detection rules: {e}")

def evaluate_detection_rules(db: Session, alert: Alert, enrichment: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Evaluates 7 versioned deterministic detection rules against the alert and enriched context.
    Returns a list of triggered rule signal dictionaries.
    """
    triggered_rules: List[Dict[str, Any]] = []
    user_ctx = (alert.user_context or "").lower()
    event_type = (alert.event_type or "").lower()
    event_cat = (alert.event_category or "").upper()
    description = (alert.description or "").lower()
    history = enrichment.get("history", {})

    # RUL-001: Failed Login Pattern
    if event_cat == "AUTHENTICATION" and ("brute force" in event_type or "credential stuffing" in event_type or "failed" in description or history.get("user_alerts_24h", 0) >= 3):
        triggered_rules.append({
            "rule_id": "RUL-001",
            "rule_name": "Failed Login Pattern",
            "rule_version": "1.0",
            "matched": True,
            "severity": "HIGH",
            "reason": f"Repeated authentication failures detected. Observed 24h history count: {history.get('user_alerts_24h', 0)} for user '{alert.user_context or 'N/A'}'.",
            "evidence": {
                "observed_failures": history.get("user_alerts_24h", 1),
                "threshold": 3,
                "time_window_hours": 24,
                "user_context": alert.user_context,
                "source_ip": alert.source_ip
            }
        })

    # RUL-002: Success After Failed Logins
    if event_cat == "AUTHENTICATION" and ("suspicious login" in event_type or "privileged login" in event_type or "mfa abuse" in event_type) and (history.get("user_alerts_24h", 0) >= 2 or history.get("source_ip_alerts_24h", 0) >= 2):
        triggered_rules.append({
            "rule_id": "RUL-002",
            "rule_name": "Success After Failed Logins",
            "rule_version": "1.0",
            "matched": True,
            "severity": "HIGH",
            "reason": f"Successful authentication event following {history.get('user_alerts_24h', 0)} prior alerts in 24h window for user '{alert.user_context}'.",
            "evidence": {
                "prior_failure_count": history.get("user_alerts_24h", 0),
                "user_context": alert.user_context,
                "source_ip": alert.source_ip,
                "time_window_hours": 24
            }
        })

    # RUL-003: Impossible Travel
    if event_cat == "AUTHENTICATION" and "impossible travel" in event_type:
        triggered_rules.append({
            "rule_id": "RUL-003",
            "rule_name": "Impossible Travel",
            "rule_version": "1.0",
            "matched": True,
            "severity": "CRITICAL",
            "reason": f"Impossible travel sequence detected for user '{alert.user_context}'. Successive logins occurred from geographically distant locations.",
            "evidence": {
                "user_context": alert.user_context,
                "source_ip": alert.source_ip,
                "description": alert.description
            }
        })

    # RUL-004: Privileged Login
    if event_cat == "AUTHENTICATION" and ("privileged login" in event_type or "admin" in user_ctx or "sys_admin" in user_ctx or "root" in user_ctx or "service_acct" in user_ctx or "privileged" in description):
        triggered_rules.append({
            "rule_id": "RUL-004",
            "rule_name": "Privileged Login",
            "rule_version": "1.0",
            "matched": True,
            "severity": "MEDIUM",
            "reason": f"Privileged/administrative account authentication detected for user '{alert.user_context}'. Requires validation of authorized activity.",
            "evidence": {
                "user_context": alert.user_context,
                "privilege_level": "ADMINISTRATIVE",
                "source_ip": alert.source_ip
            }
        })

    # RUL-005: Suspicious Process
    if event_cat == "ENDPOINT" and ("suspicious powershell" in event_type or "suspicious process" in event_type or "malware detection" in event_type or "ransomware behavior" in event_type or "privilege escalation" in event_type):
        triggered_rules.append({
            "rule_id": "RUL-005",
            "rule_name": "Suspicious Process",
            "rule_version": "1.0",
            "matched": True,
            "severity": alert.severity,
            "reason": f"Suspicious process or execution behavior detected on asset '{alert.asset_context or 'N/A'}'. Event type: '{alert.event_type}'.",
            "evidence": {
                "event_type": alert.event_type,
                "asset_context": alert.asset_context,
                "indicator": alert.indicator,
                "technique": alert.technique
            }
        })

    # RUL-006: Bulk Database Extraction
    if event_cat == "DATABASE" and ("bulk data read" in event_type or "unusual query" in event_type or "privilege abuse" in event_type or "suspicious database login" in event_type):
        triggered_rules.append({
            "rule_id": "RUL-006",
            "rule_name": "Bulk Database Extraction",
            "rule_version": "1.0",
            "matched": True,
            "severity": alert.severity,
            "reason": f"Bulk database data extraction or anomalous query activity detected on target asset '{alert.asset_context or 'N/A'}'.",
            "evidence": {
                "event_type": alert.event_type,
                "asset_context": alert.asset_context,
                "user_context": alert.user_context,
                "description": alert.description
            }
        })

    # RUL-007: Suspicious DNS Activity
    if event_cat == "NETWORK" and ("suspicious dns" in event_type or "command-and-control" in event_type or "data exfiltration" in event_type or "dns tunneling" in description):
        triggered_rules.append({
            "rule_id": "RUL-007",
            "rule_name": "Suspicious DNS Activity",
            "rule_version": "1.0",
            "matched": True,
            "severity": alert.severity,
            "reason": f"Suspicious DNS tunnel, command-and-control, or high-entropy domain query detected from source IP '{alert.source_ip or 'N/A'}'.",
            "evidence": {
                "event_type": alert.event_type,
                "source_ip": alert.source_ip,
                "destination_ip": alert.destination_ip,
                "indicator": alert.indicator
            }
        })

    return triggered_rules
