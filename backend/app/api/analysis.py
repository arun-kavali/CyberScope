import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.identity import Profile
from app.models.evidence import Alert
from app.models.intelligence import AlertAnalysis
from app.auth.dependencies import require_soc_analyst
from app.schemas.alerts import AlertAnalysisResponseSchema
from app.services.triage import execute_alert_triage

router = APIRouter(prefix="/analysis", tags=["Analysis"])

@router.get("/alert/{alert_id}", response_model=AlertAnalysisResponseSchema, status_code=status.HTTP_200_OK)
async def get_analysis_by_alert_id(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves the automatic triage analysis record for a given alert UUID.
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

@router.post("/alert/{alert_id}", response_model=AlertAnalysisResponseSchema, status_code=status.HTTP_200_OK)
async def trigger_analysis_for_alert_id(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Triggers/re-evaluates Phase 9 automatic triage and context enrichment for an alert.
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
