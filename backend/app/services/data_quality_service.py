from typing import List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.evidence import Alert
from app.models.intelligence import Incident, IncidentAlert, AlertAnalysis
from app.schemas.data_quality import DataQualitySummary, DataQualityIssue

VALID_CATEGORIES = {
    "AUTHENTICATION", "NETWORK", "ENDPOINT", "DATABASE",
    "APPLICATION", "CLOUD", "IDENTITY", "SYSTEM", "MALWARE"
}

VALID_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

class DataQualityService:

    @staticmethod
    def run_quality_checks(db: Session) -> DataQualitySummary:
        issues: List[DataQualityIssue] = []
        now = datetime.now(timezone.utc)

        # Fetch alerts for inspection (limit to latest 1000 for performance)
        alerts = db.scalars(select(Alert).order_by(Alert.timestamp.desc()).limit(1000)).all()
        total_checked = len(alerts)

        # Index linked alert IDs in incidents
        linked_alert_ids = set(db.scalars(select(IncidentAlert.alert_id)).all())

        fingerprint_counts: Dict[str, int] = {}

        for alt in alerts:
            # 1. Missing / Invalid Severity
            if not alt.severity or alt.severity not in VALID_SEVERITIES:
                issues.append(DataQualityIssue(
                    rule_code="DQ-001",
                    issue_type="INVALID_SEVERITY",
                    affected_entity="Alert",
                    affected_id=str(alt.id),
                    reason=f"Alert severity '{alt.severity}' is missing or outside valid range {VALID_SEVERITIES}",
                    severity="HIGH",
                    threshold_applied="severity IN (LOW, MEDIUM, HIGH, CRITICAL)"
                ))

            # 2. Missing User & Asset Context
            if not alt.user_context and not alt.asset_context:
                issues.append(DataQualityIssue(
                    rule_code="DQ-002",
                    issue_type="MISSING_ENTITY_CONTEXT",
                    affected_entity="Alert",
                    affected_id=str(alt.id),
                    reason="Alert lacks both user_context and asset_context",
                    severity="MEDIUM",
                    threshold_applied="user_context IS NOT NULL OR asset_context IS NOT NULL",
                    is_insufficient_data=True
                ))

            # 3. Missing Incident Relationship for High/Critical Alerts
            if alt.severity in ("HIGH", "CRITICAL") and alt.id not in linked_alert_ids:
                issues.append(DataQualityIssue(
                    rule_code="DQ-003",
                    issue_type="UNLINKED_HIGH_SEVERITY_ALERT",
                    affected_entity="Alert",
                    affected_id=str(alt.id),
                    reason=f"High/Critical alert ({alt.severity}) is not linked to any correlated Incident",
                    severity="MEDIUM",
                    threshold_applied="HIGH/CRITICAL alerts must belong to an Incident cluster",
                    is_insufficient_data=True
                ))

            # 4. Invalid Time Ordering (Future Timestamps)
            if alt.timestamp and alt.timestamp > now:
                issues.append(DataQualityIssue(
                    rule_code="DQ-004",
                    issue_type="FUTURE_TIMESTAMP",
                    affected_entity="Alert",
                    affected_id=str(alt.id),
                    reason=f"Alert timestamp {alt.timestamp.isoformat()} is set in the future relative to server time {now.isoformat()}",
                    severity="CRITICAL",
                    threshold_applied="timestamp <= CURRENT_TIMESTAMP"
                ))

            # 5. Unexpected Event Category
            if alt.event_category and alt.event_category.upper() not in VALID_CATEGORIES:
                issues.append(DataQualityIssue(
                    rule_code="DQ-005",
                    issue_type="UNEXPECTED_CATEGORY",
                    affected_entity="Alert",
                    affected_id=str(alt.id),
                    reason=f"Alert event category '{alt.event_category}' is outside known taxonomy",
                    severity="LOW",
                    threshold_applied="event_category IN VALID_TAXONOMY"
                ))

            # Track duplicate alert codes or source IPs
            if alt.alert_code:
                fingerprint_counts[alt.alert_code] = fingerprint_counts.get(alt.alert_code, 0) + 1

        # 6. Duplicate Alert Records
        for code, count in fingerprint_counts.items():
            if count > 1:
                issues.append(DataQualityIssue(
                    rule_code="DQ-006",
                    issue_type="DUPLICATE_ALERT_RECORDS",
                    affected_entity="Alert",
                    affected_id=code,
                    reason=f"Detected {count} alert records sharing duplicate alert_code {code}",
                    severity="HIGH",
                    threshold_applied="alert_code uniqueness count == 1"
                ))

        critical_cnt = sum(1 for i in issues if i.severity == "CRITICAL")
        high_cnt = sum(1 for i in issues if i.severity == "HIGH")
        insufficient_cnt = sum(1 for i in issues if i.is_insufficient_data)

        # Quality score calculation (0 to 100)
        score = max(0.0, round(100.0 - (critical_cnt * 10 + high_cnt * 5 + len(issues) * 1), 2))

        return DataQualitySummary(
            timestamp=now,
            total_records_checked=total_checked,
            total_issues_found=len(issues),
            critical_issues=critical_cnt,
            high_issues=high_cnt,
            insufficient_data_count=insufficient_cnt,
            quality_score=score,
            issues=issues
        )
