import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class ResponsePolicyResponseSchema(BaseModel):
    id: uuid.UUID
    policy_id_code: str
    policy_name: str
    conditions: Optional[Dict[str, Any]] = None
    action: str
    enabled: bool
    requires_approval: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class ResponseActionCreateSchema(BaseModel):
    action_type: str = Field(..., description="BLOCK_IP, DISABLE_USER, TERMINATE_SESSION, ISOLATE_ENDPOINT, QUARANTINE_ARTIFACT, INVESTIGATE_FURTHER")
    target_entity_type: str = Field(..., description="IP, USER, ENDPOINT, ARTIFACT, ALERT, INCIDENT")
    target_entity_id: str
    policy_id: Optional[uuid.UUID] = None
    reason: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ResponseActionResponseSchema(BaseModel):
    id: uuid.UUID
    action_type: str
    policy_id: Optional[uuid.UUID] = None
    policy_id_code: Optional[str] = None
    target_entity_type: str
    target_entity_id: str
    status: str  # RECOMMENDED, PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED, ROLLED_BACK, FAILED
    requested_by: Optional[uuid.UUID] = None
    approved_by: Optional[uuid.UUID] = None
    execution_payload: Optional[Dict[str, Any]] = None
    executed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class PolicyEvaluationRequestSchema(BaseModel):
    target_entity_type: str
    target_entity_id: str
    risk_score: Optional[float] = 0.0
    confidence_score: Optional[float] = 0.0
    malicious_indicator: Optional[bool] = False
    context: Optional[Dict[str, Any]] = None

class ActionApproveRequestSchema(BaseModel):
    reason: Optional[str] = "Approved by SOC Analyst"

class ActionRejectRequestSchema(BaseModel):
    reason: str = Field(..., min_length=1, description="Reason for rejecting action")

class ActionRollbackRequestSchema(BaseModel):
    reason: Optional[str] = "Rollback requested by SOC Analyst"
