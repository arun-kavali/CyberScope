import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.session import get_db
from app.auth.dependencies import require_soc_analyst
from app.models.identity import Profile
from app.models.response import ResponsePolicy, ResponseAction
from app.schemas.response import (
    ResponsePolicyResponseSchema,
    ResponseActionCreateSchema,
    ResponseActionResponseSchema,
    PolicyEvaluationRequestSchema,
    ActionApproveRequestSchema,
    ActionRejectRequestSchema,
    ActionRollbackRequestSchema
)
from app.services.response_service import ResponseService

router = APIRouter(prefix="/response", tags=["Response"])

def _format_action_response(db: Session, a: ResponseAction) -> ResponseActionResponseSchema:
    policy_code = None
    if a.policy_id:
        pol = db.get(ResponsePolicy, a.policy_id)
        if pol:
            policy_code = pol.policy_id_code

    return ResponseActionResponseSchema(
        id=a.id,
        action_type=a.action_type,
        policy_id=a.policy_id,
        policy_id_code=policy_code,
        target_entity_type=a.target_entity_type,
        target_entity_id=a.target_entity_id,
        status=a.status,
        requested_by=a.requested_by,
        approved_by=a.approved_by,
        execution_payload=a.execution_payload,
        executed_at=a.executed_at,
        created_at=a.created_at
    )

@router.get("/policies", response_model=List[ResponsePolicyResponseSchema])
def list_response_policies(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    policies = ResponseService.list_policies(db)
    return policies

@router.get("/actions", response_model=List[ResponseActionResponseSchema])
def list_response_actions(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    actions = db.scalars(select(ResponseAction).order_by(desc(ResponseAction.created_at))).all()
    return [_format_action_response(db, a) for a in actions]

@router.post("/evaluate", response_model=ResponseActionResponseSchema)
def evaluate_response_policy(
    payload: PolicyEvaluationRequestSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    action = ResponseService.evaluate_policies(
        db=db,
        target_entity_type=payload.target_entity_type,
        target_entity_id=payload.target_entity_id,
        risk_score=payload.risk_score or 0.0,
        confidence_score=payload.confidence_score or 0.0,
        malicious_indicator=payload.malicious_indicator or False,
        context=payload.context
    )
    return _format_action_response(db, action)

@router.post("/actions", response_model=ResponseActionResponseSchema)
def create_response_action(
    payload: ResponseActionCreateSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    try:
        action = ResponseService.create_action(
            db=db,
            action_type=payload.action_type,
            target_entity_type=payload.target_entity_type,
            target_entity_id=payload.target_entity_id,
            policy_id=payload.policy_id,
            requested_by=current_user.id,
            reason=payload.reason,
            context=payload.context
        )
        return _format_action_response(db, action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/actions/{id}/approve", response_model=ResponseActionResponseSchema)
def approve_response_action(
    id: uuid.UUID,
    payload: Optional[ActionApproveRequestSchema] = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    try:
        reason = payload.reason if payload else "Approved by SOC Analyst"
        action = ResponseService.approve_action(db=db, action_id=id, analyst_id=current_user.id, reason=reason)
        return _format_action_response(db, action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/actions/{id}/reject", response_model=ResponseActionResponseSchema)
def reject_response_action(
    id: uuid.UUID,
    payload: ActionRejectRequestSchema,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    try:
        action = ResponseService.reject_action(db=db, action_id=id, analyst_id=current_user.id, reason=payload.reason)
        return _format_action_response(db, action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/actions/{id}/rollback", response_model=ResponseActionResponseSchema)
def rollback_response_action(
    id: uuid.UUID,
    payload: Optional[ActionRollbackRequestSchema] = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    try:
        reason = payload.reason if payload else "Rollback requested by SOC Analyst"
        action = ResponseService.rollback_action(db=db, action_id=id, analyst_id=current_user.id, reason=reason)
        return _format_action_response(db, action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
