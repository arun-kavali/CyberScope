import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class AuditLogResponseSchema(BaseModel):
    id: uuid.UUID
    actor_user_id: Optional[uuid.UUID] = None
    actor_name: Optional[str] = None
    role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    reason: Optional[str] = None
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    audit_metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime

    model_config = {"from_attributes": True}

class AuditLogListResponseSchema(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AuditLogResponseSchema]
