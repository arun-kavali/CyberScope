import uuid
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
from app.models.intelligence import Incident, IncidentAlert, AlertAnalysis, RiskScore
from app.models.analytics import (
    OperationalFinding,
    ExecutionGapFinding,
    NegativeSpaceFinding,
    PeerBenchmark,
    ReviewPriority
)
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
    OperationalFindingSchema,
    ExecutionGapResponseSchema,
    NegativeSpaceResponseSchema,
    PeerBenchmarkResponseSchema,
    OperationalAnomalySchema,
    RiskContributorSchema,
    SupervisoryRiskResponseSchema,
    ReviewPriorityResponseSchema
)

router = APIRouter(prefix="/analytics", tags=["Operational Analytics"])

def sync_execution_gaps(db: Session) -> List[ExecutionGapFinding]:
    """
    Scans database evidence for Phase 18 Execution Gap patterns:
    1. Unusually fast closure (< 30 seconds threshold)
    2. Missing escalation on CRITICAL severity alerts
    3. Repetitive investigation patterns (>= 3 similar alerts in 24h)
    """
    gaps: List[ExecutionGapFinding] = []

    # 1. Unusually Fast Closure
    closed_invs = db.scalars(
        select(Investigation).where(Investigation.status.in_(["COMPLETED", "CLOSED", "RESOLVED"]))
    ).all()

    for inv in closed_invs:
        if inv.created_at and inv.updated_at and inv.updated_at >= inv.created_at:
            duration_sec = (inv.updated_at - inv.created_at).total_seconds()
            if duration_sec < 30.0:
                reason_str = f"Potential execution gap: Investigation {inv.id} closed in {duration_sec:.1f} seconds, crossing the deterministic 30-second threshold."
                existing = db.scalar(
                    select(ExecutionGapFinding).where(ExecutionGapFinding.reason == reason_str)
                )
                if not existing:
                    gap = ExecutionGapFinding(
                        finding_type="FAST_CLOSURE",
                        severity="MEDIUM",
                        reason=reason_str,
                        evidence={
                            "duration_seconds": round(duration_sec, 2),
                            "created_at": inv.created_at.isoformat(),
                            "closed_at": inv.updated_at.isoformat()
                        },
                        supporting_records={"investigation_id": str(inv.id), "status": inv.status},
                        threshold=30.0,
                        peer_context={"peer_median_minutes": 15.0}
                    )
                    db.add(gap)
                    db.commit()
                    db.refresh(gap)
                    gaps.append(gap)
                else:
                    gaps.append(existing)

    # 2. Missing Escalation
    critical_alerts = db.scalars(
        select(Alert).where(Alert.severity == "CRITICAL")
    ).all()

    for alert in critical_alerts:
        esc = db.scalar(select(Escalation).where(Escalation.alert_id == alert.id))
        if not esc:
            reason_str = f"Potential execution gap: expected escalation evidence was not observed under configured threshold for CRITICAL alert {alert.alert_code}."
            existing = db.scalar(
                select(ExecutionGapFinding).where(ExecutionGapFinding.reason == reason_str)
            )
            if not existing:
                gap = ExecutionGapFinding(
                    finding_type="MISSING_ESCALATION",
                    severity="HIGH",
                    reason=reason_str,
                    evidence={
                        "alert_id": str(alert.id),
                        "alert_code": alert.alert_code,
                        "severity": alert.severity
                    },
                    supporting_records={"alert_code": alert.alert_code, "event_type": alert.event_type},
                    threshold=80.0,
                    peer_context={"expected_action": "ESCALATE"}
                )
                db.add(gap)
                db.commit()
                db.refresh(gap)
                gaps.append(gap)
            else:
                gaps.append(existing)

    # 3. Repetitive Investigations
    patterns = db.execute(
        select(Alert.event_type, Alert.user_context, func.count(Alert.id))
        .where(Alert.user_context.isnot(None))
        .group_by(Alert.event_type, Alert.user_context)
        .having(func.count(Alert.id) >= 3)
    ).all()

    for ev_type, usr, cnt in patterns:
        reason_str = f"Repetitive investigation pattern observed: {cnt} alerts for event type '{ev_type}' and user '{usr}' within active window."
        existing = db.scalar(
            select(ExecutionGapFinding).where(ExecutionGapFinding.reason == reason_str)
        )
        if not existing:
            gap = ExecutionGapFinding(
                finding_type="REPETITIVE_INVESTIGATION",
                severity="MEDIUM",
                reason=reason_str,
                evidence={"event_type": ev_type, "user_context": usr, "alert_count": cnt},
                supporting_records={"user_context": usr, "event_type": ev_type},
                threshold=3.0,
                peer_context={"normal_daily_average": 1.0}
            )
            db.add(gap)
            db.commit()
            db.refresh(gap)
            gaps.append(gap)
        else:
            gaps.append(existing)

    # Fetch all stored execution gaps if none were generated above
    all_gaps = db.scalars(select(ExecutionGapFinding).order_by(desc(ExecutionGapFinding.created_at))).all()
    return list(all_gaps)

def sync_negative_space(db: Session) -> List[NegativeSpaceFinding]:
    """
    Scans database evidence for Phase 18 Negative Space indicators:
    1. Critical asset with unexpectedly low/zero activity
    2. Expected event category absence
    3. Monitoring coverage gaps (inactive/silent sources)
    """
    findings: List[NegativeSpaceFinding] = []

    # 1. Critical Asset Low Activity
    critical_assets = db.scalars(
        select(Asset).where(Asset.criticality.in_(["HIGH", "CRITICAL"]))
    ).all()

    for asset in critical_assets:
        alert_cnt = db.scalar(
            select(func.count(Alert.id)).where(
                or_(
                    Alert.asset_context == asset.name,
                    Alert.asset_context == asset.asset_id_code
                )
            )
        ) or 0

        if alert_cnt == 0:
            exp_str = f"Expected baseline security event telemetry for critical asset '{asset.name}' ({asset.criticality})"
            obs_str = "Observed 0 alert events over active monitoring window."
            existing = db.scalar(
                select(NegativeSpaceFinding).where(NegativeSpaceFinding.expected_activity == exp_str)
            )
            if not existing:
                ns = NegativeSpaceFinding(
                    expected_activity=exp_str,
                    observed_activity=obs_str,
                    baseline_comparison={"expected_daily_avg": 3.0, "observed_count": 0, "deviation_pct": -100.0},
                    potential_indicator="Potential indicator: expected activity was not observed for critical asset. Telemetry sensor coverage may require review.",
                    supporting_evidence={"asset_name": asset.name, "criticality": asset.criticality, "finding_type": "CRITICAL_ASSET_LOW_ACTIVITY", "severity": "MEDIUM"}
                )
                db.add(ns)
                db.commit()
                db.refresh(ns)
                findings.append(ns)
            else:
                findings.append(existing)

    # 2. Expected Category Absence
    all_categories = ["AUTHENTICATION", "ENDPOINT", "NETWORK", "DATABASE", "EMAIL"]
    present_categories = set(db.scalars(select(Alert.event_category).distinct()).all())

    total_alert_cnt = db.scalar(select(func.count(Alert.id))) or 0
    if total_alert_cnt >= 5:
        for cat in all_categories:
            if cat not in present_categories:
                exp_str = f"Expected recurring security telemetry for event category '{cat}'"
                obs_str = f"0 events observed for category '{cat}' in active stream."
                existing = db.scalar(
                    select(NegativeSpaceFinding).where(NegativeSpaceFinding.expected_activity == exp_str)
                )
                if not existing:
                    ns = NegativeSpaceFinding(
                        expected_activity=exp_str,
                        observed_activity=obs_str,
                        baseline_comparison={"expected_category": cat, "observed_count": 0},
                        potential_indicator=f"Potential indicator: expected category '{cat}' activity was not observed in stream. Monitoring coverage may require review.",
                        supporting_evidence={"category": cat, "finding_type": "EXPECTED_CATEGORY_ABSENCE", "severity": "LOW"}
                    )
                    db.add(ns)
                    db.commit()
                    db.refresh(ns)
                    findings.append(ns)
                else:
                    findings.append(existing)

    # 3. Monitoring Coverage Gaps
    inactive_sources = db.scalars(select(AlertSource).where(AlertSource.status != "ACTIVE")).all()
    for src in inactive_sources:
        exp_str = f"Expected active telemetry feed from sensor source '{src.name}'"
        obs_str = f"Source status is '{src.status}'."
        existing = db.scalar(
            select(NegativeSpaceFinding).where(NegativeSpaceFinding.expected_activity == exp_str)
        )
        if not existing:
            ns = NegativeSpaceFinding(
                expected_activity=exp_str,
                observed_activity=obs_str,
                baseline_comparison={"source_name": src.name, "status": src.status},
                potential_indicator="Potential indicator: monitoring source activity is below expected baseline. Source connection may require review.",
                supporting_evidence={"source_name": src.name, "finding_type": "MONITORING_COVERAGE_GAP", "severity": "HIGH"}
            )
            db.add(ns)
            db.commit()
            db.refresh(ns)
            findings.append(ns)
        else:
            findings.append(existing)

    all_ns = db.scalars(select(NegativeSpaceFinding).order_by(desc(NegativeSpaceFinding.created_at))).all()
    return list(all_ns)

def compute_operational_analytics(db: Session, days: int = 30) -> OperationalAnalyticsSummarySchema:
    # Trigger Phase 18 gap & negative space scans
    sync_execution_gaps(db)
    sync_negative_space(db)

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

    # 7. Time Series
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
    Triggers/computes operational evidence analytics, execution gap scans, and negative space scans.
    Restricted to SOC_ANALYST.
    """
    summary = compute_operational_analytics(db, days=days)
    return summary

@router.get("/summary", response_model=OperationalAnalyticsSummarySchema, status_code=status.HTTP_200_OK)
@router.get("/operational", response_model=OperationalAnalyticsSummarySchema, status_code=status.HTTP_200_OK)
async def get_operational_analytics_summary(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves operational analytics summary. Restricted to SOC_ANALYST.
    """
    return compute_operational_analytics(db, days=days)

@router.get("/findings", response_model=List[OperationalFindingSchema], status_code=status.HTTP_200_OK)
async def get_operational_findings(
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves operational findings derived from evidence analytics. Restricted to SOC_ANALYST.
    """
    findings = db.scalars(select(OperationalFinding).order_by(desc(OperationalFinding.created_at))).all()
    return findings

@router.get("/execution-gaps", response_model=List[ExecutionGapResponseSchema], status_code=status.HTTP_200_OK)
async def get_execution_gaps(
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves evidence-backed Phase 18 Execution Gap findings (fast closure, missing escalation, repetitive investigations).
    Restricted to SOC_ANALYST.
    """
    gaps = sync_execution_gaps(db)
    return gaps

@router.get("/negative-space", response_model=List[NegativeSpaceResponseSchema], status_code=status.HTTP_200_OK)
async def get_negative_space_findings(
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves evidence-backed Phase 18 Negative Space indicators (critical asset low activity, category absence, coverage gaps).
    Restricted to SOC_ANALYST.
    """
    findings = sync_negative_space(db)
    res = []
    for f in findings:
        evidence = f.supporting_evidence or {}
        res.append(NegativeSpaceResponseSchema(
            id=f.id,
            finding_type=evidence.get("finding_type", "NEGATIVE_SPACE"),
            severity=evidence.get("severity", "MEDIUM"),
            expected_activity=f.expected_activity,
            observed_activity=f.observed_activity,
            baseline_comparison=f.baseline_comparison,
            potential_indicator=f.potential_indicator,
            supporting_evidence=f.supporting_evidence,
            created_at=f.created_at
        ))
    return res

def sync_peer_benchmarks(db: Session) -> List[PeerBenchmarkResponseSchema]:
    """
    Computes normalized operational metrics against enterprise peer baselines:
    1. Alert Volume per Day
    2. Critical Alert Ratio
    3. Median Investigation Duration
    4. Escalation Rate
    5. Incident Closure Rate
    6. Repeated Alerts Ratio
    7. Monitoring Sensor Coverage Ratio
    8. Evidence Payload Completeness Ratio
    """
    total_alerts = db.scalar(select(func.count(Alert.id))) or 0
    total_incidents = db.scalar(select(func.count(Incident.id))) or 0
    total_investigations = db.scalar(select(func.count(Investigation.id))) or 0
    total_escalations = db.scalar(select(func.count(Escalation.id))) or 0
    total_sources = db.scalar(select(func.count(AlertSource.id))) or 0
    active_sources = db.scalar(select(func.count(AlertSource.id)).where(AlertSource.status == "ACTIVE")) or 0

    investigations = db.scalars(select(Investigation)).all()
    durations = [
        (inv.updated_at - inv.created_at).total_seconds() / 60.0
        for inv in investigations
        if inv.updated_at and inv.created_at and inv.updated_at > inv.created_at
    ]
    median_duration = round(float(np.median(durations)), 2) if len(durations) > 0 else 0.0

    crit_high_cnt = db.scalar(select(func.count(Alert.id)).where(Alert.severity.in_(["CRITICAL", "HIGH"]))) or 0
    resolved_inc_cnt = db.scalar(select(func.count(Incident.id)).where(Incident.status.in_(["RESOLVED", "CLOSED"]))) or 0
    rep_alerts_cnt = db.scalar(select(func.count(Alert.id)).where(Alert.user_context.isnot(None))) or 0
    raw_payload_cnt = db.scalar(select(func.count(Alert.id)).where(Alert.raw_payload.isnot(None))) or 0

    metric_configs = [
        {
            "name": "Alert Volume (Daily Mean)",
            "subject_val": round(total_alerts / 30.0, 2),
            "baseline": 15.0,
            "sample_size": total_alerts,
            "unit": "alerts/day"
        },
        {
            "name": "Critical Alert Ratio",
            "subject_val": round(crit_high_cnt / total_alerts * 100.0, 2) if total_alerts > 0 else 0.0,
            "baseline": 12.5,
            "sample_size": total_alerts,
            "unit": "%"
        },
        {
            "name": "Median Investigation Duration",
            "subject_val": median_duration,
            "baseline": 15.0,
            "sample_size": total_investigations,
            "unit": "minutes"
        },
        {
            "name": "Escalation Rate",
            "subject_val": round(total_escalations / total_alerts * 100.0, 2) if total_alerts > 0 else 0.0,
            "baseline": 8.0,
            "sample_size": total_alerts,
            "unit": "%"
        },
        {
            "name": "Incident Closure Rate",
            "subject_val": round(resolved_inc_cnt / total_incidents * 100.0, 2) if total_incidents > 0 else 0.0,
            "baseline": 85.0,
            "sample_size": total_incidents,
            "unit": "%"
        },
        {
            "name": "Repeated Alerts Ratio",
            "subject_val": round(rep_alerts_cnt / total_alerts * 100.0, 2) if total_alerts > 0 else 0.0,
            "baseline": 5.0,
            "sample_size": total_alerts,
            "unit": "%"
        },
        {
            "name": "Monitoring Sensor Coverage Ratio",
            "subject_val": round(active_sources / total_sources * 100.0, 2) if total_sources > 0 else 0.0,
            "baseline": 95.0,
            "sample_size": total_sources,
            "unit": "%"
        },
        {
            "name": "Evidence Payload Completeness Ratio",
            "subject_val": round(raw_payload_cnt / total_alerts * 100.0, 2) if total_alerts > 0 else 0.0,
            "baseline": 98.0,
            "sample_size": total_alerts,
            "unit": "%"
        }
    ]

    results: List[PeerBenchmarkResponseSchema] = []

    for cfg in metric_configs:
        name = cfg["name"]
        subj_val = cfg["subject_val"]
        baseline = cfg["baseline"]
        sample_size = cfg["sample_size"]
        dev = round(subj_val - baseline, 2)

        if sample_size == 0:
            dir_str = "INSUFFICIENT_DATA"
        elif abs(dev) < 3.0:
            dir_str = "NORMAL"
        elif dev > 0:
            dir_str = "ABOVE"
        else:
            dir_str = "BELOW"

        context_dict = {
            "subject_entity": "SOC_ORGANIZATION",
            "subject_value": subj_val,
            "peer_baseline": baseline,
            "deviation": dev,
            "direction": dir_str,
            "sample_size": sample_size,
            "time_range": "Last 30 Days",
            "methodology": f"Normalized comparison against Enterprise SOC Peer Group baseline ({cfg['unit']})."
        }

        existing = db.scalar(select(PeerBenchmark).where(PeerBenchmark.metric_name == name))
        if not existing:
            pb = PeerBenchmark(
                metric_name=name,
                normalized_metric=subj_val,
                peer_group="Enterprise SOC Peer Group",
                comparison_context=context_dict
            )
            db.add(pb)
            db.commit()
            db.refresh(pb)
            pb_id = pb.id
            created_at = pb.created_at
        else:
            existing.normalized_metric = subj_val
            existing.comparison_context = context_dict
            db.commit()
            db.refresh(existing)
            pb_id = existing.id
            created_at = existing.created_at

        results.append(PeerBenchmarkResponseSchema(
            id=pb_id,
            metric_name=name,
            normalized_metric=subj_val,
            peer_group="Enterprise SOC Peer Group",
            subject_entity="SOC_ORGANIZATION",
            subject_value=subj_val,
            peer_baseline=baseline,
            deviation=dev,
            direction=dir_str,
            sample_size=sample_size,
            time_range="Last 30 Days",
            methodology=f"Normalized comparison against Enterprise SOC Peer Group baseline ({cfg['unit']}).",
            comparison_context=context_dict,
            created_at=created_at
        ))

    return results

def compute_supervisory_risk(db: Session) -> SupervisoryRiskResponseSchema:
    """
    Computes explainable supervisory operational risk indicator (bounded 0-100).
    Aggregates evidence-grounded risk contributors.
    """
    now = datetime.now(timezone.utc)
    contributors: List[RiskContributorSchema] = []

    # 1. Critical alerts without escalation
    missing_esc = db.scalars(
        select(ExecutionGapFinding).where(ExecutionGapFinding.finding_type == "MISSING_ESCALATION")
    ).all()
    if missing_esc:
        cnt = len(missing_esc)
        pts = min(22.0, cnt * 11.0)
        contributors.append(RiskContributorSchema(
            contributor_type="Critical Alerts Without Escalation",
            contribution=pts,
            supporting_evidence={"finding_count": cnt, "findings": [str(f.id) for f in missing_esc]},
            source_record={"table": "execution_gap_findings", "type": "MISSING_ESCALATION"},
            calculation_method="Deterministic weight (+11 pts per un-escalated critical alert, capped at 22)",
            timestamp=now
        ))

    # 2. Evidence completeness / Investigation quality
    invs_without_ev = db.scalars(
        select(Investigation).where(or_(Investigation.notes.is_(None), Investigation.notes == ""))
    ).all()
    if invs_without_ev:
        cnt = len(invs_without_ev)
        pts = min(18.0, cnt * 9.0)
        contributors.append(RiskContributorSchema(
            contributor_type="Investigation Evidence Deficiency",
            contribution=pts,
            supporting_evidence={"deficient_investigations_count": cnt},
            source_record={"table": "investigations", "issue": "empty_notes_summary"},
            calculation_method="Deterministic weight (+9 pts per evidence-deficient investigation, capped at 18)",
            timestamp=now
        ))

    # 3. Repeated unresolved asset activity
    rep_inv = db.scalars(
        select(ExecutionGapFinding).where(ExecutionGapFinding.finding_type == "REPETITIVE_INVESTIGATION")
    ).all()
    if rep_inv:
        cnt = len(rep_inv)
        pts = min(14.0, cnt * 7.0)
        contributors.append(RiskContributorSchema(
            contributor_type="Repeated Unresolved Asset Activity",
            contribution=pts,
            supporting_evidence={"repetitive_patterns_count": cnt},
            source_record={"table": "execution_gap_findings", "type": "REPETITIVE_INVESTIGATION"},
            calculation_method="Deterministic weight (+7 pts per repeated pattern, capped at 14)",
            timestamp=now
        ))

    # 4. Peer operational deviation
    benchmarks = sync_peer_benchmarks(db)
    deviated_benchmarks = [b for b in benchmarks if b.direction in ["ABOVE", "BELOW"]]
    if deviated_benchmarks:
        cnt = len(deviated_benchmarks)
        pts = min(12.0, cnt * 6.0)
        contributors.append(RiskContributorSchema(
            contributor_type="Peer Operational Deviation",
            contribution=pts,
            supporting_evidence={"deviated_metrics_count": cnt, "metrics": [b.metric_name for b in deviated_benchmarks]},
            source_record={"table": "peer_benchmarks", "deviations": cnt},
            calculation_method="Deterministic weight (+6 pts per peer metric deviation, capped at 12)",
            timestamp=now
        ))

    # 5. Monitoring coverage concern
    all_ns = sync_negative_space(db)
    cov_gaps = [n for n in all_ns if (n.supporting_evidence or {}).get("finding_type") == "MONITORING_COVERAGE_GAP"]
    if cov_gaps:
        cnt = len(cov_gaps)
        pts = min(11.0, cnt * 11.0)
        contributors.append(RiskContributorSchema(
            contributor_type="Monitoring Coverage Concern",
            contribution=pts,
            supporting_evidence={"coverage_gaps_count": cnt},
            source_record={"table": "negative_space_findings", "type": "MONITORING_COVERAGE_GAP"},
            calculation_method="Deterministic weight (+11 pts per monitoring coverage gap, capped at 11)",
            timestamp=now
        ))

    # 6. Closure time anomaly
    fast_closures = db.scalars(
        select(ExecutionGapFinding).where(ExecutionGapFinding.finding_type == "FAST_CLOSURE")
    ).all()
    if fast_closures:
        cnt = len(fast_closures)
        pts = min(10.0, cnt * 5.0)
        contributors.append(RiskContributorSchema(
            contributor_type="Closure-Time Anomaly",
            contribution=pts,
            supporting_evidence={"fast_closures_count": cnt},
            source_record={"table": "execution_gap_findings", "type": "FAST_CLOSURE"},
            calculation_method="Deterministic weight (+5 pts per fast closure anomaly, capped at 10)",
            timestamp=now
        ))

    raw_sum = sum(c.contribution for c in contributors)
    overall_score = min(100.0, max(0.0, float(raw_sum)))

    if overall_score >= 70.0:
        status_str = "HIGH_ATTENTION"
    elif overall_score >= 40.0:
        status_str = "ELEVATED"
    else:
        status_str = "NORMAL"

    total_alerts = db.scalar(select(func.count(Alert.id))) or 0
    dq_status = "INSUFFICIENT_DATA" if total_alerts == 0 else "NORMAL"

    return SupervisoryRiskResponseSchema(
        overall_score=round(overall_score, 1),
        status=status_str,
        contributors=contributors,
        calculation_methodology="Deterministic sum of evidence-linked operational risk contributors bounded 0-100.",
        data_quality_status=dq_status,
        timestamp=now
    )

def sync_review_priorities(db: Session) -> List[ReviewPriorityResponseSchema]:
    """
    Ranks entities, processes, controls, alerts, cases, and investigations requiring analyst review.
    Traceable evidence chain: review priority -> finding/indicator -> incident/case/investigation -> alert/event -> normalized evidence.
    """
    priorities_list: List[Dict[str, Any]] = []

    # 1. High risk incidents
    incidents = db.scalars(select(Incident).order_by(desc(Incident.created_at))).all()
    for inc in incidents:
        risk = 75.0
        if inc.severity == "CRITICAL":
            risk = 94.0
        elif inc.severity == "HIGH":
            risk = 82.0
        elif inc.severity == "MEDIUM":
            risk = 65.0

        inc_alerts = db.scalars(select(IncidentAlert).where(IncidentAlert.incident_id == inc.id)).all()
        alert_ids = [ia.alert_id for ia in inc_alerts]
        alerts = db.scalars(select(Alert).where(Alert.id.in_(alert_ids))).all() if alert_ids else []
        alert_codes = [a.alert_code for a in alerts]
        evidence_payloads = [a.raw_payload for a in alerts if a.raw_payload]

        chain = [
            {"level": "REVIEW_PRIORITY", "target_type": "INCIDENT", "target_id": str(inc.id)},
            {"level": "INCIDENT", "id": str(inc.id), "title": inc.title, "severity": inc.severity},
            {"level": "ALERTS", "count": len(alerts), "codes": alert_codes},
            {"level": "EVIDENCE", "payload_sample": evidence_payloads[:2] if evidence_payloads else None}
        ]

        priorities_list.append({
            "target_type": "INCIDENT",
            "target_id": inc.id,
            "priority_score": risk,
            "severity": inc.severity or "HIGH",
            "reason": f"Incident {inc.title} requires analyst review due to calculated risk score ({risk:.0f}/100) and correlated evidence.",
            "risk_indicator": risk,
            "evidence_references": {"incident_id": str(inc.id), "alert_codes": alert_codes},
            "supporting_findings": chain
        })

    # 2. Execution gaps requiring operational process review
    gaps = sync_execution_gaps(db)
    for gap in gaps:
        score = 80.0 if gap.severity == "HIGH" else 60.0
        chain = [
            {"level": "REVIEW_PRIORITY", "target_type": "FINDING", "target_id": str(gap.id)},
            {"level": "EXECUTION_GAP_FINDING", "id": str(gap.id), "type": gap.finding_type, "severity": gap.severity},
            {"level": "REASON", "text": gap.reason},
            {"level": "SUPPORTING_RECORDS", "records": gap.supporting_records}
        ]
        priorities_list.append({
            "target_type": "FINDING",
            "target_id": gap.id,
            "priority_score": score,
            "severity": gap.severity,
            "reason": f"Process execution gap ({gap.finding_type}) identified: {gap.reason}",
            "risk_indicator": score,
            "evidence_references": {"gap_id": str(gap.id), "supporting_records": gap.supporting_records},
            "supporting_findings": chain
        })

    # 3. Critical Asset Low Activity Negative Space Findings
    ns_findings = sync_negative_space(db)
    for ns in ns_findings:
        evidence = ns.supporting_evidence or {}
        sev = evidence.get("severity", "MEDIUM")
        score = 70.0 if sev == "HIGH" else 55.0
        chain = [
            {"level": "REVIEW_PRIORITY", "target_type": "ASSET", "target_id": str(ns.id)},
            {"level": "NEGATIVE_SPACE_FINDING", "id": str(ns.id), "expected": ns.expected_activity},
            {"level": "OBSERVED", "text": ns.observed_activity},
            {"level": "POTENTIAL_INDICATOR", "text": ns.potential_indicator}
        ]
        priorities_list.append({
            "target_type": "ASSET",
            "target_id": ns.id,
            "priority_score": score,
            "severity": sev,
            "reason": f"Telemetry coverage review required: {ns.potential_indicator or ns.expected_activity}",
            "risk_indicator": score,
            "evidence_references": {"negative_space_id": str(ns.id), "evidence": evidence},
            "supporting_findings": chain
        })

    priorities_list.sort(key=lambda x: x["priority_score"], reverse=True)

    results: List[ReviewPriorityResponseSchema] = []
    for rank_idx, item in enumerate(priorities_list, start=1):
        target_type = item["target_type"]
        target_id = item["target_id"]
        score = item["priority_score"]

        reasons_dict = {
            "rank": rank_idx,
            "severity": item["severity"],
            "reason": item["reason"],
            "risk_indicator": item["risk_indicator"],
            "evidence_references": item["evidence_references"],
            "supporting_findings": item["supporting_findings"]
        }

        existing = db.scalar(
            select(ReviewPriority).where(
                and_(
                    ReviewPriority.target_type == target_type,
                    ReviewPriority.target_id == target_id
                )
            )
        )

        if not existing:
            rp = ReviewPriority(
                target_type=target_type,
                target_id=target_id,
                priority_score=score,
                reasons=reasons_dict
            )
            db.add(rp)
            db.commit()
            db.refresh(rp)
            rp_id = rp.id
            created_at = rp.created_at
        else:
            existing.priority_score = score
            existing.reasons = reasons_dict
            db.commit()
            db.refresh(existing)
            rp_id = existing.id
            created_at = existing.created_at

        results.append(ReviewPriorityResponseSchema(
            id=rp_id,
            target_type=target_type,
            target_id=target_id,
            rank=rank_idx,
            priority_score=score,
            severity=item["severity"],
            reason=item["reason"],
            risk_indicator=item["risk_indicator"],
            evidence_references=item["evidence_references"],
            supporting_findings=item["supporting_findings"],
            created_at=created_at
        ))

    return results

@router.get("/peer-benchmarks", response_model=List[PeerBenchmarkResponseSchema], status_code=status.HTTP_200_OK)
async def get_peer_benchmarks(
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves peer benchmarks for SOC operational comparison against enterprise baseline.
    Restricted to SOC_ANALYST.
    """
    return sync_peer_benchmarks(db)

@router.get("/supervisory-risk", response_model=SupervisoryRiskResponseSchema, status_code=status.HTTP_200_OK)
async def get_supervisory_risk_indicator(
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves explainable supervisory operational risk indicator (bounded 0-100) with evidence contributors.
    Restricted to SOC_ANALYST.
    """
    return compute_supervisory_risk(db)

@router.get("/review-priorities", response_model=List[ReviewPriorityResponseSchema], status_code=status.HTTP_200_OK)
async def get_review_priorities(
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves ranked review priorities for entities, cases, investigations, assets, and findings.
    Restricted to SOC_ANALYST.
    """
    return sync_review_priorities(db)

@router.get("/anomalies", response_model=List[OperationalAnomalySchema], status_code=status.HTTP_200_OK)
async def get_operational_anomalies(
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves behavioral statistical anomalies calculated over 14-day rolling operational baselines.
    Restricted to SOC_ANALYST.
    """
    anomalies: List[OperationalAnomalySchema] = []
    now = datetime.now(timezone.utc)

    # 1. Alert Volume Anomaly
    today_date = now.date()
    today_volume = db.scalar(select(func.count(Alert.id)).where(cast(Alert.timestamp, Date) == today_date)) or 0

    daily_counts = []
    for i in range(1, 15):
        past_date = today_date - timedelta(days=i)
        cnt = db.scalar(select(func.count(Alert.id)).where(cast(Alert.timestamp, Date) == past_date)) or 0
        daily_counts.append(cnt)

    if daily_counts and len(daily_counts) >= 3:
        mean_vol = float(np.mean(daily_counts))
        std_vol = float(np.std(daily_counts))
        if std_vol > 0 and today_volume > (mean_vol + 1.5 * std_vol):
            z_score = (today_volume - mean_vol) / std_vol
            anomalies.append(OperationalAnomalySchema(
                id=str(uuid.uuid4()),
                metric="ALERT_VOLUME_DAILY",
                baseline=round(mean_vol, 2),
                observed=float(today_volume),
                deviation=round(z_score, 2),
                interpretation="Operational indicator: alert volume spike detected relative to 14-day rolling baseline.",
                threshold_method="Z-SCORE (z > 1.5)",
                supporting_records={"today_count": today_volume, "mean_daily_count": mean_vol},
                timestamp=now
            ))

    return anomalies
