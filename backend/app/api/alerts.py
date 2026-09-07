import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.models.identity import Profile
from app.models.evidence import Alert
from app.models.sources import AlertSource
from app.auth.dependencies import get_current_user, require_alert_source
from app.schemas.alerts import (
    AlertCreateSchema,
    BatchAlertCreateSchema,
    AlertResponseSchema,
    AlertBatchResponseSchema,
    ScenarioGenerateRequestSchema,
    ScenarioPreviewResponseSchema
)
from app.services.generator import generate_synthetic_alerts_data, EXACT_SCENARIO_CATEGORIES

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
    Submits and persists a single synthetic security alert into PostgreSQL.
    Strictly protected for ALERT_SOURCE role.
    """
    if payload.event_category not in EXACT_SCENARIO_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid event_category '{payload.event_category}'. Must be one of {list(EXACT_SCENARIO_CATEGORIES.keys())}"
        )

    if payload.severity not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid severity '{payload.severity}'. Must be LOW, MEDIUM, HIGH, or CRITICAL."
        )

    source_id = _get_or_create_default_source(db)
    event_timestamp = payload.timestamp or datetime.now(timezone.utc)
    if event_timestamp.tzinfo is None:
        event_timestamp = event_timestamp.replace(tzinfo=timezone.utc)

    alert_code = f"ALT-{random.randint(10000, 99999)}"

    db_alert = Alert(
        alert_code=alert_code,
        source_id=source_id,
        event_type=payload.event_type,
        event_category=payload.event_category,
        severity=payload.severity,
        status=payload.status or "NEW",
        timestamp=event_timestamp,
        user_context=payload.user_context,
        asset_context=payload.asset_context,
        source_ip=payload.source_ip,
        destination_ip=payload.destination_ip,
        source_port=payload.source_port,
        destination_port=payload.destination_port,
        protocol=payload.protocol,
        action=payload.action,
        description=payload.description,
        indicator=payload.indicator,
        technique=payload.technique,
        raw_payload=payload.raw_payload or {},
        alert_metadata=payload.alert_metadata or {"synthetic": True}
    )

    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)

    return db_alert

@router.post("/batch", response_model=AlertBatchResponseSchema, status_code=status.HTTP_201_CREATED)
async def submit_batch_alerts(
    payload: BatchAlertCreateSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_alert_source)
):
    """
    Submits a batch of synthetic security alerts into PostgreSQL with quantity limit protection (max 100).
    """
    if len(payload.alerts) > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Batch limit exceeded. Maximum 100 alerts permitted per submission."
        )

    source_id = _get_or_create_default_source(db)
    created_alerts = []

    for alert_data in payload.alerts:
        event_timestamp = alert_data.timestamp or datetime.now(timezone.utc)
        if event_timestamp.tzinfo is None:
            event_timestamp = event_timestamp.replace(tzinfo=timezone.utc)

        alert_code = f"ALT-{random.randint(10000, 99999)}"
        db_alert = Alert(
            alert_code=alert_code,
            source_id=source_id,
            event_type=alert_data.event_type,
            event_category=alert_data.event_category,
            severity=alert_data.severity,
            status=alert_data.status or "NEW",
            timestamp=event_timestamp,
            user_context=alert_data.user_context,
            asset_context=alert_data.asset_context,
            source_ip=alert_data.source_ip,
            destination_ip=alert_data.destination_ip,
            source_port=alert_data.source_port,
            destination_port=alert_data.destination_port,
            protocol=alert_data.protocol,
            action=alert_data.action,
            description=alert_data.description,
            indicator=alert_data.indicator,
            technique=alert_data.technique,
            raw_payload=alert_data.raw_payload or {},
            alert_metadata=alert_data.alert_metadata or {"synthetic": True}
        )
        db.add(db_alert)
        created_alerts.append(db_alert)

    db.commit()
    for a in created_alerts:
        db.refresh(a)

    return AlertBatchResponseSchema(
        accepted_count=len(created_alerts),
        rejected_count=0,
        alerts=created_alerts,
        message=f"Successfully ingested {len(created_alerts)} synthetic alerts into PostgreSQL."
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
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    Retrieves real persisted alert submission history from PostgreSQL with pagination.
    Accessible to authenticated users.
    """
    query = select(Alert)
    if category:
        query = query.where(Alert.event_category == category)
    if severity:
        query = query.where(Alert.severity == severity)

    query = query.order_by(desc(Alert.created_at)).offset((page - 1) * page_size).limit(page_size)
    alerts = db.scalars(query).all()
    return alerts
