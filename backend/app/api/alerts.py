import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc, or_, and_, cast, String

from app.db.session import get_db
from app.models.identity import Profile
from app.models.evidence import Alert
from app.models.intelligence import (
    AlertAnalysis,
    RiskScore,
    AnomalyScore,
    CorrelationResult,
    Incident,
    IncidentAlert,
    AIIntelligence
)
from app.models.sources import AlertSource
from app.auth.dependencies import get_current_user, require_alert_source, require_soc_analyst
from app.schemas.alerts import (
    AlertCreateSchema,
    BatchAlertCreateSchema,
    AlertResponseSchema,
    AlertBatchResponseSchema,
    ScenarioGenerateRequestSchema,
    ScenarioPreviewResponseSchema,
    IngestionResultSchema,
    AlertAnalysisResponseSchema,
    RelatedAlertSchema,
    AlertIncidentRelationshipSchema,
    AlertTimelineEventSchema
)
from app.schemas.ai import AIIntelligenceResponse
from app.services.generator import generate_synthetic_alerts_data, EXACT_SCENARIO_CATEGORIES
from app.services.ingestion import process_alert_ingestion
from app.services.triage import execute_alert_triage

router = APIRouter(prefix="/alerts", tags=["Alerts"])

def _get_or_create_default_source(db: Session) -> uuid.UUID:
    source = db.scalar(select(AlertSource).where(AlertSource.name == "Synthetic Scenario Generator"))
    if not source:
        source = AlertSource(
            name="Synthetic Scenario Generator",
            source_type="SYNTHETIC",
            status="ACTIVE",
            source_metadata={"description": "Built-in synthetic alert generator source"}
        )
        db.add(source)
        db.commit()
        db.refresh(source)
    return source.id

@router.post("", response_model=AlertResponseSchema, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AlertResponseSchema, status_code=status.HTTP_201_CREATED)
async def submit_single_alert(
    payload: AlertCreateSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_alert_source)
):
    """
    Submits, validates, normalizes, and persists a single synthetic security alert into PostgreSQL.
    Strictly protected for ALERT_SOURCE role.
    """
    source_id = _get_or_create_default_source(db)
    result = process_alert_ingestion(db, payload.model_dump(), source_id=source_id)

    if result.status == "FAILED":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.validation["issues"]
        )

    return result.alert

@router.post("/batch", response_model=AlertBatchResponseSchema, status_code=status.HTTP_201_CREATED)
async def submit_batch_alerts(
    payload: BatchAlertCreateSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_alert_source)
):
    """
    Submits a batch of synthetic security alerts through the Phase 7 ingestion pipeline.
    Max quantity limit: 100 per batch.
    """
    if len(payload.alerts) > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Batch limit exceeded. Maximum 100 alerts permitted per submission."
        )

    source_id = _get_or_create_default_source(db)
    accepted_alerts = []
    rejected_count = 0
    duplicate_count = 0

    for alert_data in payload.alerts:
        res = process_alert_ingestion(db, alert_data.model_dump(), source_id=source_id, is_batch=True)
        if res.status == "FAILED":
            rejected_count += 1
        elif res.status == "DUPLICATE":
            duplicate_count += 1
            if res.alert:
                accepted_alerts.append(res.alert)
        else:
            if res.alert:
                accepted_alerts.append(res.alert)

    return AlertBatchResponseSchema(
        accepted_count=len(accepted_alerts),
        rejected_count=rejected_count,
        duplicate_count=duplicate_count,
        alerts=accepted_alerts,
        message=f"Ingestion complete. Accepted: {len(accepted_alerts)}, Duplicates: {duplicate_count}, Rejected: {rejected_count}."
    )

@router.post("/generate-preview", response_model=ScenarioPreviewResponseSchema, status_code=status.HTTP_200_OK)
async def generate_scenario_preview(
    payload: ScenarioGenerateRequestSchema,
    current_user: Profile = Depends(require_alert_source)
):
    """
    Generates in-memory synthetic alert preview records based on scenario parameters.
    """
    try:
        raw_generated = generate_synthetic_alerts_data(
            category=payload.category,
            scenario_name=payload.scenario_name,
            generation_mode=payload.generation_mode,
            severity=payload.severity,
            intent=payload.intent,
            quantity=payload.quantity,
            start_time=payload.start_time,
            custom_params=payload.custom_params
        )
        return ScenarioPreviewResponseSchema(
            category=payload.category,
            scenario_name=payload.scenario_name,
            generation_mode=payload.generation_mode,
            severity=payload.severity,
            intent=payload.intent,
            generated_count=len(raw_generated),
            alerts=raw_generated
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.get("", response_model=List[AlertResponseSchema], status_code=status.HTTP_200_OK)
@router.get("/", response_model=List[AlertResponseSchema], status_code=status.HTTP_200_OK)
async def list_submitted_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    alert_id: Optional[str] = Query(None),
    incident_id: Optional[str] = Query(None),
    user: Optional[str] = Query(None),
    asset: Optional[str] = Query(None),
    source_ip: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    risk_min: Optional[float] = Query(None),
    risk_max: Optional[float] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    Retrieves real persisted security alert history with server-side search, multi-field filtering, and pagination.
    Accessible to authenticated users.
    """
    query = select(Alert)

    if category and category.upper() != "ALL":
        query = query.where(Alert.event_category == category.upper())
    if severity and severity.upper() != "ALL":
        query = query.where(Alert.severity == severity.upper())
    if status_filter and status_filter.upper() != "ALL":
        query = query.where(Alert.status == status_filter.upper())
    if event_type:
        query = query.where(Alert.event_type.ilike(f"%{event_type}%"))
    if user:
        query = query.where(Alert.user_context.ilike(f"%{user}%"))
    if asset:
        query = query.where(Alert.asset_context.ilike(f"%{asset}%"))
    if source_ip:
        query = query.where(Alert.source_ip.ilike(f"%{source_ip}%"))
    if alert_id:
        query = query.where(
            or_(
                Alert.alert_code.ilike(f"%{alert_id}%"),
                cast(Alert.id, String).ilike(f"%{alert_id}%")
            )
        )
    if start_time:
        query = query.where(Alert.timestamp >= start_time)
    if end_time:
        query = query.where(Alert.timestamp <= end_time)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Alert.alert_code.ilike(search_pattern),
                Alert.event_type.ilike(search_pattern),
                Alert.event_category.ilike(search_pattern),
                Alert.description.ilike(search_pattern),
                Alert.user_context.ilike(search_pattern),
                Alert.asset_context.ilike(search_pattern),
                Alert.source_ip.ilike(search_pattern),
                Alert.indicator.ilike(search_pattern),
                Alert.technique.ilike(search_pattern)
            )
        )

    if incident_id:
        query = query.join(IncidentAlert, IncidentAlert.alert_id == Alert.id).where(
            or_(
                cast(IncidentAlert.incident_id, String).ilike(f"%{incident_id}%"),
                IncidentAlert.incident_id.in_(
                    select(Incident.id).where(Incident.incident_number.ilike(f"%{incident_id}%"))
                )
            )
        )

    if risk_min is not None or risk_max is not None:
        query = query.join(RiskScore, RiskScore.alert_id == Alert.id)
        if risk_min is not None:
            query = query.where(RiskScore.score >= risk_min)
        if risk_max is not None:
            query = query.where(RiskScore.score <= risk_max)

    query = query.order_by(desc(Alert.created_at)).offset((page - 1) * page_size).limit(page_size)
    alerts = db.scalars(query).all()
    return alerts

@router.get("/{alert_id}", response_model=AlertResponseSchema, status_code=status.HTTP_200_OK)
async def get_alert_by_id(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    Retrieves a single normalized alert by UUID.
    """
    alert = db.scalar(select(Alert).where(Alert.id == alert_id))
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )
    return alert

@router.get("/{alert_id}/analysis", response_model=AlertAnalysisResponseSchema, status_code=status.HTTP_200_OK)
async def get_alert_analysis(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves the Phase 9 automatic triage analysis record for a given alert UUID.
    Restricted to SOC_ANALYST role.
    """
    alert = db.scalar(select(Alert).where(Alert.id == alert_id))
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )

    analysis = db.scalar(select(AlertAnalysis).where(AlertAnalysis.alert_id == alert_id))
    if not analysis:
        analysis = execute_alert_triage(db, alert)

    return analysis

@router.post("/{alert_id}/reanalyze", response_model=AlertAnalysisResponseSchema, status_code=status.HTTP_200_OK)
async def reanalyze_alert(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Triggers re-evaluation of Phase 9 context enrichment and detection rules for an existing alert.
    Restricted to SOC_ANALYST role.
    """
    alert = db.scalar(select(Alert).where(Alert.id == alert_id))
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )

    analysis = execute_alert_triage(db, alert)
    return analysis

@router.get("/{alert_id}/related", response_model=List[RelatedAlertSchema], status_code=status.HTTP_200_OK)
async def get_related_alerts(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves related alerts based on structured correlation results and shared entity context (user, asset, IP).
    Restricted to SOC_ANALYST role.
    """
    target_alert = db.scalar(select(Alert).where(Alert.id == alert_id))
    if not target_alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )

    related_map: Dict[uuid.UUID, str] = {}

    correlations = db.scalars(select(CorrelationResult)).all()
    for corr in correlations:
        ids = (corr.correlated_alert_ids or {}).get("alert_ids", [])
        str_target = str(alert_id)
        if str_target in ids:
            for other_id_str in ids:
                if other_id_str != str_target:
                    try:
                        u_id = uuid.UUID(other_id_str)
                        related_map[u_id] = f"Correlated via rule: {corr.rule_name}"
                    except ValueError:
                        pass

    filters = []
    if target_alert.user_context:
        filters.append(Alert.user_context == target_alert.user_context)
    if target_alert.asset_context:
        filters.append(Alert.asset_context == target_alert.asset_context)
    if target_alert.source_ip:
        filters.append(Alert.source_ip == target_alert.source_ip)

    if filters:
        heur_query = select(Alert).where(and_(Alert.id != alert_id, or_(*filters))).limit(10)
        heur_alerts = db.scalars(heur_query).all()
        for ha in heur_alerts:
            if ha.id not in related_map:
                reasons = []
                if ha.user_context and ha.user_context == target_alert.user_context:
                    reasons.append(f"Shared User '{ha.user_context}'")
                if ha.asset_context and ha.asset_context == target_alert.asset_context:
                    reasons.append(f"Shared Asset '{ha.asset_context}'")
                if ha.source_ip and ha.source_ip == target_alert.source_ip:
                    reasons.append(f"Shared IP '{ha.source_ip}'")
                related_map[ha.id] = ", ".join(reasons) or "Matching Context"

    if not related_map:
        return []

    related_alerts = db.scalars(select(Alert).where(Alert.id.in_(related_map.keys()))).all()
    res = []
    for ra in related_alerts:
        res.append(RelatedAlertSchema(
            id=ra.id,
            alert_code=ra.alert_code,
            event_type=ra.event_type,
            event_category=ra.event_category,
            severity=ra.severity,
            status=ra.status,
            timestamp=ra.timestamp,
            correlation_reason=related_map.get(ra.id, "Related Context")
        ))
    return res

@router.get("/{alert_id}/incident", response_model=Optional[AlertIncidentRelationshipSchema], status_code=status.HTTP_200_OK)
async def get_alert_incident_relationship(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves the associated Incident record for a given alert if correlated.
    Restricted to SOC_ANALYST role.
    """
    inc_alert = db.scalar(select(IncidentAlert).where(IncidentAlert.alert_id == alert_id))
    if not inc_alert:
        return None

    inc = db.scalar(select(Incident).where(Incident.id == inc_alert.incident_id))
    if not inc:
        return None

    return AlertIncidentRelationshipSchema(
        id=inc.id,
        incident_number=inc.incident_number,
        title=inc.title,
        severity=inc.severity,
        risk_score=inc.risk_score,
        confidence_score=inc.confidence_score,
        status=inc.status,
        created_at=inc.created_at
    )

@router.get("/{alert_id}/timeline", response_model=List[AlertTimelineEventSchema], status_code=status.HTTP_200_OK)
async def get_alert_timeline(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves chronological activity timeline entries for an alert.
    Restricted to SOC_ANALYST role.
    """
    alert = db.scalar(select(Alert).where(Alert.id == alert_id))
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found."
        )

    timeline: List[AlertTimelineEventSchema] = []

    timeline.append(AlertTimelineEventSchema(
        event_type="ALERT_INGESTED",
        description=f"Alert {alert.alert_code} ({alert.event_type}) ingested into canonical evidence pipeline",
        timestamp=alert.created_at,
        source="INGESTION_PIPELINE"
    ))

    analysis = db.scalar(select(AlertAnalysis).where(AlertAnalysis.alert_id == alert_id))
    if analysis:
        timeline.append(AlertTimelineEventSchema(
            event_type="TRIAGE_COMPLETED",
            description=f"Automatic Phase 9 triage completed: {analysis.summary[:100]}...",
            timestamp=analysis.created_at,
            source="TRIAGE_ENGINE"
        ))

    risk_score = db.scalar(select(RiskScore).where(RiskScore.alert_id == alert_id).order_by(desc(RiskScore.timestamp)))
    if risk_score:
        timeline.append(AlertTimelineEventSchema(
            event_type="SCORES_COMPLETED",
            description=f"Risk Score: {risk_score.score:.1f}/100 | Confidence: {risk_score.confidence:.1f}% | FP Likelihood: {risk_score.false_positive_likelihood:.1f}%",
            timestamp=risk_score.timestamp,
            source="SCORING_ENGINE"
        ))

    inc_link = db.scalar(select(IncidentAlert).where(IncidentAlert.alert_id == alert_id))
    if inc_link:
        inc = db.scalar(select(Incident).where(Incident.id == inc_link.incident_id))
        if inc:
            timeline.append(AlertTimelineEventSchema(
                event_type="CORRELATION_COMPLETED",
                description=f"Correlated into Incident {inc.incident_number}: {inc.title}",
                timestamp=inc_link.added_at,
                source="CORRELATION_ENGINE"
            ))

    ai_rec = db.scalar(select(AIIntelligence).where(and_(AIIntelligence.target_type == "ALERT", AIIntelligence.target_id == alert_id)))
    if ai_rec:
        timeline.append(AlertTimelineEventSchema(
            event_type="AI_INTELLIGENCE",
            description=f"Local Ollama AI Intelligence analysis status: {ai_rec.status}",
            timestamp=ai_rec.created_at,
            source="LOCAL_OLLAMA_AI"
        ))

    timeline.sort(key=lambda x: x.timestamp)
    return timeline

@router.get("/{alert_id}/ai", response_model=AIIntelligenceResponse, status_code=status.HTTP_200_OK)
async def get_alert_ai_record(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves existing local Ollama AI intelligence record for an alert if present.
    Restricted to SOC_ANALYST role.
    """
    ai_rec = db.scalar(select(AIIntelligence).where(and_(AIIntelligence.target_type == "ALERT", AIIntelligence.target_id == alert_id)))
    if not ai_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No AI intelligence record found for alert '{alert_id}'."
        )
    return ai_rec
