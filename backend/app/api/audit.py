import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import require_soc_analyst
from app.models.identity import Profile
from app.schemas.audit import AuditLogListResponseSchema, AuditLogResponseSchema
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("", response_model=AuditLogListResponseSchema)
def list_audit_logs(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    target_type: Optional[str] = Query(None, description="Filter by target entity type"),
    actor_user_id: Optional[uuid.UUID] = Query(None, description="Filter by actor profile ID"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    total, items = AuditService.get_audit_logs(
        db=db,
        page=page,
        page_size=page_size,
        action=action,
        target_type=target_type,
        actor_user_id=actor_user_id
    )

    formatted_items = [AuditLogResponseSchema(**item) for item in items]
    return AuditLogListResponseSchema(
        total=total,
        page=page,
        page_size=page_size,
        items=formatted_items
    )
