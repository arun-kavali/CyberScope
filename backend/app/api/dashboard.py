from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, select, desc, distinct

from app.db.session import get_db
from app.auth.dependencies import require_soc_analyst
from app.models.identity import Profile
from app.models.evidence import Alert, Case, Investigation
from app.models.sources import AlertSource
from app.models.intelligence import Incident, IncidentAlert, RiskScore
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

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    demo_mode: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Returns aggregated SOC Analyst operational dashboard metrics, alert streams,
    incident queues, distributions, and findings using efficient SQL queries.
    Protected by SOC_ANALYST server-side RBAC.
    """
    from app.auth.service import get_workspace_user_ids
    ws_user_ids = get_workspace_user_ids(db, current_user)

    # 1. Metrics Counts
    user_inc_subq = select(distinct(IncidentAlert.incident_id)).join(Alert, Alert.id == IncidentAlert.alert_id).where(Alert.submitted_by_user_id.in_(ws_user_ids))
    live_alerts_count = db.query(func.count(distinct(Alert.id))).filter(Alert.submitted_by_user_id.in_(ws_user_ids)).scalar() or 0
    critical_high_alerts_count = db.query(func.count(distinct(Alert.id))).filter(Alert.submitted_by_user_id.in_(ws_user_ids), Alert.severity.in_(["CRITICAL", "HIGH"])).scalar() or 0
    active_incidents_count = db.query(func.count(distinct(Incident.id))).filter(Incident.id.in_(user_inc_subq), Incident.status.in_(["OPEN", "IN_PROGRESS"])).scalar() or 0
    active_investigations_count = db.query(func.count(distinct(Investigation.id))).filter(Investigation.created_by_user_id.in_(ws_user_ids), Investigation.status == "IN_PROGRESS").scalar() or 0
    execution_gaps_count = db.query(func.count(distinct(ExecutionGapFinding.id))).scalar() or 0
    negative_space_count = db.query(func.count(distinct(NegativeSpaceFinding.id))).scalar() or 0
    review_priorities_count = db.query(func.count(distinct(ReviewPriority.id))).scalar() or 0

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
    sev_q = db.query(Alert.severity, func.count(distinct(Alert.id))).filter(Alert.submitted_by_user_id.in_(ws_user_ids))
    sev_rows = sev_q.group_by(Alert.severity).all()
    severity_distribution = [DistributionItemSchema(name=sev, count=cnt) for sev, cnt in sev_rows]

    # Risk distribution (bucketed)
    risk_q = db.query(RiskScore.score).join(Alert, Alert.id == RiskScore.alert_id).filter(Alert.submitted_by_user_id.in_(ws_user_ids))
    scores = [r[0] for r in risk_q.all()]
    c_crit = sum(1 for s in scores if s >= 80)
    c_high = sum(1 for s in scores if 60 <= s < 80)
    c_med = sum(1 for s in scores if 40 <= s < 60)
    c_low = sum(1 for s in scores if s < 40)
    risk_distribution = [
        DistributionItemSchema(name="Critical (80-100)", count=c_crit),
        DistributionItemSchema(name="High (60-79)", count=c_high),
        DistributionItemSchema(name="Medium (40-59)", count=c_med),
        DistributionItemSchema(name="Low (0-39)", count=c_low),
    ]

    # Source distribution
    src_q = db.query(AlertSource.name, func.count(distinct(Alert.id))).join(Alert, Alert.source_id == AlertSource.id).filter(Alert.submitted_by_user_id.in_(ws_user_ids))
    src_rows = src_q.group_by(AlertSource.name).all()
    source_distribution = [DistributionItemSchema(name=name, count=cnt) for name, cnt in src_rows]

    # Category distribution
    cat_q = db.query(Alert.event_category, func.count(distinct(Alert.id))).filter(Alert.submitted_by_user_id.in_(ws_user_ids))
    cat_rows = cat_q.group_by(Alert.event_category).all()
    category_distribution = [DistributionItemSchema(name=cat, count=cnt) for cat, cnt in cat_rows if cat]

    # Incident status distribution
    inc_q = db.query(Incident.status, func.count(distinct(Incident.id))).filter(Incident.id.in_(user_inc_subq))
    inc_status_rows = inc_q.group_by(Incident.status).all()
    inc_status_dict = {st: cnt for st, cnt in inc_status_rows}
    incident_status_distribution = [
        DistributionItemSchema(name="Open", count=inc_status_dict.get("OPEN", 0)),
        DistributionItemSchema(name="In Progress", count=inc_status_dict.get("IN_PROGRESS", 0)),
        DistributionItemSchema(name="Resolved", count=inc_status_dict.get("RESOLVED", 0) + inc_status_dict.get("CLOSED", 0)),
        DistributionItemSchema(name="Closed", count=inc_status_dict.get("CLOSED", 0)),
    ]

    # 3. Critical & High Risk Alerts (Top 10)
    crit_alert_q = (
        db.query(Alert, RiskScore.score.label("risk_val"), AlertSource.name.label("src_name"))
        .outerjoin(RiskScore, RiskScore.alert_id == Alert.id)
        .outerjoin(AlertSource, AlertSource.id == Alert.source_id)
        .filter(Alert.severity.in_(["CRITICAL", "HIGH"]))
        .filter(Alert.submitted_by_user_id.in_(ws_user_ids))
    )
    crit_alert_rows = crit_alert_q.order_by(Alert.timestamp.desc()).limit(10).all()

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
    active_inc_q = db.query(Incident).filter(Incident.status.in_(["OPEN", "IN_PROGRESS"]), Incident.id.in_(user_inc_subq))
    active_inc_rows = active_inc_q.order_by(Incident.created_at.desc()).limit(10).all()
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
    recent_inc_q = db.query(Incident).filter(Incident.id.in_(user_inc_subq))
    recent_inc_rows = recent_inc_q.order_by(Incident.updated_at.desc()).limit(10).all()
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
    operational_findings = []
    execution_gaps = []
    negative_space = []

    # 7. Operational Indicators
    avg_risk_q = db.query(func.avg(RiskScore.score)).join(Alert, Alert.id == RiskScore.alert_id).filter(Alert.submitted_by_user_id.in_(ws_user_ids))
    avg_risk = avg_risk_q.scalar() or 0.0
    avg_conf_q = db.query(func.avg(Incident.confidence_score)).filter(Incident.id.in_(user_inc_subq))
    avg_conf = avg_conf_q.scalar() or 0.0

    # Calculate "Resolved Today" (incidents resolved on current UTC calendar day)
    now_utc = datetime.now(timezone.utc)
    start_of_today_utc = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)

    res_inc_today = (
        db.query(func.count(distinct(Incident.id)))
        .filter(
            Incident.id.in_(user_inc_subq),
            Incident.status.in_(["RESOLVED", "CLOSED"]),
            Incident.updated_at >= start_of_today_utc
        )
        .scalar() or 0
    )
    tot_inc = db.query(func.count(distinct(Incident.id))).filter(Incident.id.in_(user_inc_subq)).scalar() or 0

    operational_indicators = OperationalIndicatorsSchema(
        avg_risk_score=round(float(avg_risk), 2),
        avg_confidence_score=round(float(avg_conf), 2),
        resolved_incidents_count=res_inc_today,
        total_incidents_count=tot_inc,
    )

    return DashboardSummaryResponse(
        metrics=metrics,
        severity_distribution=severity_distribution,
        risk_distribution=risk_distribution,
        source_distribution=source_distribution,
        category_distribution=category_distribution,
        incident_status_distribution=incident_status_distribution,
        critical_alerts=critical_alerts,
        active_incidents=active_incidents,
        recent_incidents=recent_incidents,
        operational_findings=operational_findings,
        execution_gaps=execution_gaps,
        negative_space=negative_space,
        operational_indicators=operational_indicators,
    )
