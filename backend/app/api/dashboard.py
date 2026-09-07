from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func, select, desc

from app.db.session import get_db
from app.auth.dependencies import require_soc_analyst
from app.models.evidence import Alert, Case, Investigation
from app.models.sources import AlertSource
from app.models.intelligence import Incident, RiskScore
from app.models.analytics import (
    ExecutionGapFinding,
    NegativeSpaceFinding,
    ReviewPriority,
    OperationalFinding,
)
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    DashboardMetricsSchema,
    DistributionItemSchema,
    OperationalIndicatorsSchema,
    DashboardAlertItemSchema,
    DashboardIncidentItemSchema,
    FindingSummaryItemSchema,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse, dependencies=[Depends(require_soc_analyst)])
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns aggregated SOC Analyst operational dashboard metrics, alert streams,
    incident queues, distributions, and findings using efficient SQL queries.
    Protected by SOC_ANALYST server-side RBAC.
    """
    # 1. Metrics Counts
    live_alerts_count = db.query(func.count(Alert.id)).scalar() or 0
    critical_high_alerts_count = db.query(func.count(Alert.id)).filter(Alert.severity.in_(["CRITICAL", "HIGH"])).scalar() or 0
    active_incidents_count = db.query(func.count(Incident.id)).filter(Incident.status.in_(["OPEN", "IN_PROGRESS"])).scalar() or 0
    active_investigations_count = db.query(func.count(Investigation.id)).filter(Investigation.status == "IN_PROGRESS").scalar() or 0
    execution_gaps_count = db.query(func.count(ExecutionGapFinding.id)).scalar() or 0
    negative_space_count = db.query(func.count(NegativeSpaceFinding.id)).scalar() or 0
    review_priorities_count = db.query(func.count(ReviewPriority.id)).scalar() or 0

    metrics = DashboardMetricsSchema(
        live_alerts_count=live_alerts_count,
        critical_high_alerts_count=critical_high_alerts_count,
        active_incidents_count=active_incidents_count,
        active_investigations_count=active_investigations_count,
        execution_gaps_count=execution_gaps_count,
        negative_space_count=negative_space_count,
        review_priorities_count=review_priorities_count,
    )

    # 2. Distributions
    # Severity distribution
    sev_rows = db.query(Alert.severity, func.count(Alert.id)).group_by(Alert.severity).all()
    severity_distribution = [DistributionItemSchema(name=sev, count=cnt) for sev, cnt in sev_rows]

    # Risk distribution (bucketed)
    c_crit = db.query(func.count(RiskScore.id)).filter(RiskScore.score >= 80).scalar() or 0
    c_high = db.query(func.count(RiskScore.id)).filter(RiskScore.score >= 60, RiskScore.score < 80).scalar() or 0
    c_med = db.query(func.count(RiskScore.id)).filter(RiskScore.score >= 40, RiskScore.score < 60).scalar() or 0
    c_low = db.query(func.count(RiskScore.id)).filter(RiskScore.score < 40).scalar() or 0
    risk_distribution = [
        DistributionItemSchema(name="Critical (80-100)", count=c_crit),
        DistributionItemSchema(name="High (60-79)", count=c_high),
        DistributionItemSchema(name="Medium (40-59)", count=c_med),
        DistributionItemSchema(name="Low (0-39)", count=c_low),
    ]

    # Source distribution
    src_rows = (
        db.query(AlertSource.name, func.count(Alert.id))
        .join(Alert, Alert.source_id == AlertSource.id)
        .group_by(AlertSource.name)
        .all()
    )
    source_distribution = [DistributionItemSchema(name=name, count=cnt) for name, cnt in src_rows]

    # Category distribution
    cat_rows = db.query(Alert.event_category, func.count(Alert.id)).group_by(Alert.event_category).all()
    category_distribution = [DistributionItemSchema(name=cat, count=cnt) for cat, cnt in cat_rows if cat]

    # 3. Critical & High Risk Alerts (Top 10)
    crit_alert_rows = (
        db.query(Alert, RiskScore.score.label("risk_val"), AlertSource.name.label("src_name"))
        .outerjoin(RiskScore, RiskScore.alert_id == Alert.id)
        .outerjoin(AlertSource, AlertSource.id == Alert.source_id)
        .filter(Alert.severity.in_(["CRITICAL", "HIGH"]))
        .order_by(Alert.timestamp.desc())
        .limit(10)
        .all()
    )

    critical_alerts = [
        DashboardAlertItemSchema(
            id=a.id,
            alert_code=a.alert_code,
            event_type=a.event_type,
            event_category=a.event_category,
            severity=a.severity,
            status=a.status,
            timestamp=a.timestamp,
            risk_score=r_val,
            source_name=s_name or "Unknown Source",
            user_context=a.user_context,
        )
        for a, r_val, s_name in crit_alert_rows
    ]

    # 4. Active Incident Queue (Top 10)
    active_inc_rows = (
        db.query(Incident)
        .filter(Incident.status.in_(["OPEN", "IN_PROGRESS"]))
        .order_by(Incident.created_at.desc())
        .limit(10)
        .all()
    )
    active_incidents = [
        DashboardIncidentItemSchema(
            id=inc.id,
            incident_number=inc.incident_number,
            title=inc.title,
            severity=inc.severity,
            risk_score=inc.risk_score,
            confidence_score=inc.confidence_score,
            status=inc.status,
            created_at=inc.created_at,
            updated_at=inc.updated_at,
        )
        for inc in active_inc_rows
    ]

    # 5. Recent Incidents (Top 10)
    recent_inc_rows = (
        db.query(Incident)
        .order_by(Incident.updated_at.desc())
        .limit(10)
        .all()
    )
    recent_incidents = [
        DashboardIncidentItemSchema(
            id=inc.id,
            incident_number=inc.incident_number,
            title=inc.title,
            severity=inc.severity,
            risk_score=inc.risk_score,
            confidence_score=inc.confidence_score,
            status=inc.status,
            created_at=inc.created_at,
            updated_at=inc.updated_at,
        )
        for inc in recent_inc_rows
    ]

    # 6. Findings Summaries
    op_findings_rows = db.query(OperationalFinding).order_by(OperationalFinding.created_at.desc()).limit(5).all()
    operational_findings = [
        FindingSummaryItemSchema(
            id=f.id,
            title=f.title,
            category=f.category,
            severity=f.severity,
            created_at=f.created_at,
        )
        for f in op_findings_rows
    ]

    eg_rows = db.query(ExecutionGapFinding).order_by(ExecutionGapFinding.created_at.desc()).limit(5).all()
    execution_gaps = [
        FindingSummaryItemSchema(
            id=f.id,
            title=f.reason[:60] if f.reason else f.finding_type,
            category=f.finding_type,
            severity=f.severity,
            created_at=f.created_at,
        )
        for f in eg_rows
    ]

    ns_rows = db.query(NegativeSpaceFinding).order_by(NegativeSpaceFinding.created_at.desc()).limit(5).all()
    negative_space = [
        FindingSummaryItemSchema(
            id=f.id,
            title=f.expected_activity[:60] if f.expected_activity else "Negative Space Finding",
            category="Negative Space",
            severity="MEDIUM",
            created_at=f.created_at,
        )
        for f in ns_rows
    ]

    # 7. Operational Indicators
    avg_risk = db.query(func.avg(RiskScore.score)).scalar() or 0.0
    avg_conf = db.query(func.avg(Incident.confidence_score)).scalar() or 0.0
    res_inc = db.query(func.count(Incident.id)).filter(Incident.status == "RESOLVED").scalar() or 0
    tot_inc = db.query(func.count(Incident.id)).scalar() or 0

    operational_indicators = OperationalIndicatorsSchema(
        avg_risk_score=round(float(avg_risk), 2),
        avg_confidence_score=round(float(avg_conf), 2),
        resolved_incidents_count=res_inc,
        total_incidents_count=tot_inc,
    )

    return DashboardSummaryResponse(
        metrics=metrics,
        severity_distribution=severity_distribution,
        risk_distribution=risk_distribution,
        source_distribution=source_distribution,
        category_distribution=category_distribution,
        critical_alerts=critical_alerts,
        active_incidents=active_incidents,
        recent_incidents=recent_incidents,
        operational_findings=operational_findings,
        execution_gaps=execution_gaps,
        negative_space=negative_space,
        operational_indicators=operational_indicators,
    )
