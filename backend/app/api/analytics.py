import numpy as np
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc, or_, and_, cast, Date

from app.db.session import get_db
from app.auth.dependencies import require_soc_analyst
from app.models.identity import Profile
from app.models.evidence import Alert, Case, Investigation, Escalation, Disposition, Asset, UserDirectory
from app.models.intelligence import Incident, AlertAnalysis, RiskScore
from app.models.analytics import OperationalFinding
from app.models.sources import AlertSource
from app.schemas.analytics import (
    OperationalAnalyticsSummarySchema,
    AlertAnalyticsSchema,
    IncidentAnalyticsSchema,
    InvestigationAnalyticsSchema,
    EscalationAnalyticsSchema,
    DispositionAnalyticsSchema,
    EntityAnalyticsSchema,
    TimeSeriesPointSchema,
    OperationalFindingSchema
)

router = APIRouter(prefix="/analytics", tags=["Operational Analytics"])

def compute_operational_analytics(db: Session, days: int = 30) -> OperationalAnalyticsSummarySchema:
    # 1. Alert Analytics
    total_alerts = db.scalar(select(func.count(Alert.id))) or 0
    
    sev_rows = db.execute(select(Alert.severity, func.count(Alert.id)).group_by(Alert.severity)).all()
    severity_dist = {r[0]: r[1] for r in sev_rows}

    cat_rows = db.execute(select(Alert.event_category, func.count(Alert.id)).group_by(Alert.event_category)).all()
    category_dist = {r[0]: r[1] for r in cat_rows}

    src_rows = db.execute(
        select(AlertSource.name, func.count(Alert.id))
        .join(Alert, Alert.source_id == AlertSource.id)
        .group_by(AlertSource.name)
    ).all()
    source_dist = {r[0]: r[1] for r in src_rows}

    crit_high_count = db.scalar(
        select(func.count(Alert.id)).where(Alert.severity.in_(["CRITICAL", "HIGH"]))
    ) or 0
    critical_high_ratio = round((crit_high_count / total_alerts * 100.0), 2) if total_alerts > 0 else 0.0

    subq = (
        select(Alert.event_type, Alert.user_context)
        .where(Alert.user_context.isnot(None))
        .group_by(Alert.event_type, Alert.user_context)
        .having(func.count() > 1)
        .subquery()
    )
    repeated_patterns_count = db.scalar(select(func.count()).select_from(subq)) or 0

    alert_analytics = AlertAnalyticsSchema(
        total_alerts=total_alerts,
        severity_distribution=severity_dist,
        category_distribution=category_dist,
        source_distribution=source_dist,
        critical_high_ratio=critical_high_ratio,
        repeated_patterns_count=repeated_patterns_count
    )

    # 2. Incident Analytics
    total_incidents = db.scalar(select(func.count(Incident.id))) or 0
    inc_status_rows = db.execute(select(Incident.status, func.count(Incident.id)).group_by(Incident.status)).all()
    inc_status_dist = {r[0]: r[1] for r in inc_status_rows}

    inc_sev_rows = db.execute(select(Incident.severity, func.count(Incident.id)).group_by(Incident.severity)).all()
    inc_sev_dist = {r[0]: r[1] for r in inc_sev_rows}

    resolved_count = inc_status_dist.get("RESOLVED", 0)
    closure_rate = round((resolved_count / total_incidents * 100.0), 2) if total_incidents > 0 else 0.0

    incident_analytics = IncidentAnalyticsSchema(
        total_incidents=total_incidents,
        status_distribution=inc_status_dist,
        severity_distribution=inc_sev_dist,
        closure_rate=closure_rate,
        reopened_count=0
    )

    # 3. Investigation Analytics
    total_investigations = db.scalar(select(func.count(Investigation.id))) or 0
    inv_status_rows = db.execute(select(Investigation.status, func.count(Investigation.id)).group_by(Investigation.status)).all()
    inv_status_dist = {r[0]: r[1] for r in inv_status_rows}

    investigations = db.scalars(select(Investigation)).all()
    durations = [
        (inv.updated_at - inv.created_at).total_seconds() / 60.0
        for inv in investigations
        if inv.updated_at and inv.created_at and inv.updated_at > inv.created_at
    ]

    mean_duration = round(float(np.mean(durations)), 2) if len(durations) > 0 else 0.0
    median_duration = round(float(np.median(durations)), 2) if len(durations) > 0 else 0.0

    investigation_analytics = InvestigationAnalyticsSchema(
        total_investigations=total_investigations,
        status_distribution=inv_status_dist,
        mean_duration_minutes=mean_duration,
        median_duration_minutes=median_duration
    )

    # 4. Escalation Analytics
    total_escalations = db.scalar(select(func.count(Escalation.id))) or 0
    escalation_rate = round((total_escalations / total_alerts * 100.0), 2) if total_alerts > 0 else 0.0

    esc_sev_rows = db.execute(
        select(Alert.severity, func.count(Escalation.id))
        .join(Alert, Alert.id == Escalation.alert_id)
        .group_by(Alert.severity)
    ).all()
    esc_sev_dist = {r[0]: r[1] for r in esc_sev_rows}

    escalation_analytics = EscalationAnalyticsSchema(
        total_escalations=total_escalations,
        escalation_rate=escalation_rate,
        severity_distribution=esc_sev_dist
    )

    # 5. Disposition Analytics
    total_dispositions = db.scalar(select(func.count(Disposition.id))) or 0
    disp_rows = db.execute(select(Disposition.disposition_type, func.count(Disposition.id)).group_by(Disposition.disposition_type)).all()
    disp_dist = {r[0]: r[1] for r in disp_rows}

    fp_benign_count = disp_dist.get("FALSE_POSITIVE", 0) + disp_dist.get("BENIGN", 0)
    fp_benign_ratio = round((fp_benign_count / total_dispositions * 100.0), 2) if total_dispositions > 0 else 0.0

    disposition_analytics = DispositionAnalyticsSchema(
        total_dispositions=total_dispositions,
        disposition_distribution=disp_dist,
        fp_benign_ratio=fp_benign_ratio
    )

    # 6. Entity Analytics
    top_assets_rows = db.execute(
        select(Alert.asset_context, func.count(Alert.id))
        .where(Alert.asset_context.isnot(None))
        .group_by(Alert.asset_context)
        .order_by(desc(func.count(Alert.id)))
        .limit(5)
    ).all()
    top_assets = [{"asset": r[0], "alert_count": r[1]} for r in top_assets_rows]

    top_users_rows = db.execute(
        select(Alert.user_context, func.count(Alert.id))
        .where(Alert.user_context.isnot(None))
        .group_by(Alert.user_context)
        .order_by(desc(func.count(Alert.id)))
        .limit(5)
    ).all()
    top_users = [{"user": r[0], "alert_count": r[1]} for r in top_users_rows]

    top_sources_rows = db.execute(
        select(AlertSource.name, func.count(Alert.id))
        .join(Alert, Alert.source_id == AlertSource.id)
        .group_by(AlertSource.name)
        .order_by(desc(func.count(Alert.id)))
        .limit(5)
    ).all()
    top_sources = [{"source": r[0], "alert_count": r[1]} for r in top_sources_rows]

    entity_analytics = EntityAnalyticsSchema(
        top_assets=top_assets,
        top_users=top_users,
        top_sources=top_sources
    )

    # 7. Time Series (Last 7 Days)
    today = datetime.now(timezone.utc).date()
    time_series = []
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_str = day_date.strftime("%Y-%m-%d")

        alert_cnt = db.scalar(select(func.count(Alert.id)).where(cast(Alert.timestamp, Date) == day_date)) or 0
        inc_cnt = db.scalar(select(func.count(Incident.id)).where(cast(Incident.created_at, Date) == day_date)) or 0
        inv_cnt = db.scalar(select(func.count(Investigation.id)).where(cast(Investigation.created_at, Date) == day_date)) or 0
        esc_cnt = db.scalar(select(func.count(Escalation.id)).where(cast(Escalation.created_at, Date) == day_date)) or 0

        time_series.append(TimeSeriesPointSchema(
            date=day_str,
            alerts=alert_cnt,
            incidents=inc_cnt,
            investigations=inv_cnt,
            escalations=esc_cnt
        ))

    # 8. Data Quality Status
    if total_alerts == 0 and total_incidents == 0:
        dq_status = "NO_DATA"
    elif total_alerts < 3:
        dq_status = "INSUFFICIENT_DATA"
    else:
        dq_status = "NORMAL"

    return OperationalAnalyticsSummarySchema(
        alert_analytics=alert_analytics,
        incident_analytics=incident_analytics,
        investigation_analytics=investigation_analytics,
        escalation_analytics=escalation_analytics,
        disposition_analytics=disposition_analytics,
        entity_analytics=entity_analytics,
        time_series=time_series,
        data_quality_status=dq_status,
        disclaimer="Operational security analytics computed from real persisted CyberScope PostgreSQL database evidence."
    )

@router.post("/run", response_model=OperationalAnalyticsSummarySchema, status_code=status.HTTP_200_OK)
async def run_operational_analytics(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Triggers or re-computes operational evidence analytics over persisted database evidence.
    Restricted to SOC_ANALYST role.
    """
    summary = compute_operational_analytics(db, days=days)

    # Optional: Generate findings if thresholds exceeded
    if summary.alert_analytics.critical_high_ratio > 40.0 and summary.alert_analytics.total_alerts >= 5:
        existing = db.scalar(select(OperationalFinding).where(OperationalFinding.title == "Elevated Critical Alert Ratio"))
        if not existing:
            finding = OperationalFinding(
                title="Elevated Critical Alert Ratio",
                category="SEVERITY_PATTERN",
                severity="HIGH",
                impact=f"Critical/High severity alerts constitute {summary.alert_analytics.critical_high_ratio}% of total alert volume.",
                recommendations={"action": "Audit triage rules and prioritize incident resolution"}
            )
            db.add(finding)
            db.commit()

    return summary

@router.get("/summary", response_model=OperationalAnalyticsSummarySchema, status_code=status.HTTP_200_OK)
@router.get("/operational", response_model=OperationalAnalyticsSummarySchema, status_code=status.HTTP_200_OK)
async def get_operational_analytics_summary(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves operational analytics summary metrics across alerts, incidents, investigations, escalations, dispositions, and entities.
    Restricted to SOC_ANALYST role.
    """
    return compute_operational_analytics(db, days=days)

@router.get("/findings", response_model=List[OperationalFindingSchema], status_code=status.HTTP_200_OK)
async def get_operational_findings(
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves persisted operational findings derived from evidence analytics.
    Restricted to SOC_ANALYST role.
    """
    findings = db.scalars(select(OperationalFinding).order_by(desc(OperationalFinding.created_at))).all()
    return findings
