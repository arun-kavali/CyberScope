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
    ScenarioPreviewResponseSchema,
    IngestionResultSchema
)
from app.services.generator import generate_synthetic_alerts_data, EXACT_SCENARIO_CATEGORIES
from app.services.ingestion import process_alert_ingestion

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
