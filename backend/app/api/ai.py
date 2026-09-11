import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import require_soc_analyst
from app.models.identity import Profile
from app.services.llm import ollama_service
from app.services.ai_service import ai_service
from app.schemas.ai import AIStatusResponse, AIIntelligenceResponse

router = APIRouter(prefix="/ai", tags=["Local AI Intelligence"])

@router.get("/status", response_model=AIStatusResponse)
async def check_ai_status(
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Queries local Ollama health status and model availability.
    Only accessible by SOC Analysts.
    """
    status_data = await ollama_service.check_availability()
    return status_data

from app.services.audit_service import AuditService

@router.post("/alerts/{id}/intelligence", response_model=AIIntelligenceResponse)
async def generate_alert_ai_intelligence(
    id: uuid.UUID,
    force_refresh: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Triggers or fetches evidence-grounded local AI explanation for an alert.
    Protected by SOC_ANALYST RBAC.
    """
    try:
        record = await ai_service.generate_alert_intelligence(db, id, force_refresh=force_refresh)
        AuditService.log_event(
            db=db,
            action="AI_ANALYSIS_GENERATED",
            actor_user_id=current_analyst.id,
            role=current_analyst.role.name if current_analyst.role else "SOC_ANALYST",
            target_type="ALERT",
            target_id=str(id),
            reason="Generated AI intelligence explanation for alert",
            audit_metadata={"model_used": record.model_name, "force_refresh": force_refresh}
        )
        return record
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
    except Exception as err:
        AuditService.log_event(
            db=db,
            action="AI_ANALYSIS_FAILED",
            actor_user_id=current_analyst.id,
            role=current_analyst.role.name if current_analyst.role else "SOC_ANALYST",
            target_type="ALERT",
            target_id=str(id),
            reason="AI intelligence generation failed",
            audit_metadata={"error": str(err)}
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI analysis is currently unavailable. Please try again.")

@router.post("/incidents/{id}/intelligence", response_model=AIIntelligenceResponse)
async def generate_incident_ai_intelligence(
    id: uuid.UUID,
    force_refresh: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Triggers or fetches evidence-grounded local AI summary for an incident.
    Protected by SOC_ANALYST RBAC.
    """
    try:
        record = await ai_service.generate_incident_intelligence(db, id, force_refresh=force_refresh)
        AuditService.log_event(
            db=db,
            action="AI_ANALYSIS_GENERATED",
            actor_user_id=current_analyst.id,
            role=current_analyst.role.name if current_analyst.role else "SOC_ANALYST",
            target_type="INCIDENT",
            target_id=str(id),
            reason="Generated AI summary for incident",
            audit_metadata={"model_used": record.model_name, "force_refresh": force_refresh}
        )
        return record
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
    except Exception as err:
        AuditService.log_event(
            db=db,
            action="AI_ANALYSIS_FAILED",
            actor_user_id=current_analyst.id,
            role=current_analyst.role.name if current_analyst.role else "SOC_ANALYST",
            target_type="INCIDENT",
            target_id=str(id),
            reason="AI incident generation failed",
            audit_metadata={"error": str(err)}
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI analysis is currently unavailable. Please try again.")

@router.post("/incidents/{id}/investigation-narrative", response_model=AIIntelligenceResponse)
async def generate_investigation_narrative(
    id: uuid.UUID,
    force_refresh: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_analyst: Profile = Depends(require_soc_analyst)
):
    """
    Triggers or fetches investigation narrative & advisory recommendations for an incident workspace.
    Protected by SOC_ANALYST RBAC.
    """
    try:
        record = await ai_service.generate_investigation_narrative(db, id, force_refresh=force_refresh)
        AuditService.log_event(
            db=db,
            action="AI_ANALYSIS_GENERATED",
            actor_user_id=current_analyst.id,
            role=current_analyst.role.name if current_analyst.role else "SOC_ANALYST",
            target_type="INCIDENT",
            target_id=str(id),
            reason="Generated investigation narrative for incident",
            audit_metadata={"model_used": record.model_name, "force_refresh": force_refresh}
        )
        return record
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
    except Exception as err:
        AuditService.log_event(
            db=db,
            action="AI_ANALYSIS_FAILED",
            actor_user_id=current_analyst.id,
            role=current_analyst.role.name if current_analyst.role else "SOC_ANALYST",
            target_type="INCIDENT",
            target_id=str(id),
            reason="AI narrative generation failed",
            audit_metadata={"error": str(err)}
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI analysis is currently unavailable. Please try again.")
