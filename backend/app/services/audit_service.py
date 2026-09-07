import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.models.audit import AuditLog
from app.models.identity import Profile

SENSITIVE_KEYS = {"password", "secret", "token", "api_key", "credentials", "auth", "private_key", "service_role_key"}

def sanitize_audit_metadata(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not data:
        return data
    sanitized = {}
    for key, value in data.items():
        if any(s_key in key.lower() for s_key in SENSITIVE_KEYS):
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_audit_metadata(value)
        else:
            sanitized[key] = value
    return sanitized

class AuditService:
    @staticmethod
    def sanitize_dict(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        return sanitize_audit_metadata(data)

    @staticmethod
    def log_event(
        db: Session,
        action: str,
        actor_user_id: Optional[uuid.UUID] = None,
        role: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        reason: Optional[str] = None,
        previous_state: Optional[Dict[str, Any]] = None,
        new_state: Optional[Dict[str, Any]] = None,
        audit_metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Append-only audit logger. Silently sanitizes any credential or secret keys.
        """
        # Auto-fetch role if actor_user_id is provided but role is omitted
        if actor_user_id and not role:
            user = db.get(Profile, actor_user_id)
            if user and user.role:
                role = user.role.name

        audit_entry = AuditLog(
            actor_user_id=actor_user_id,
            role=role or "SYSTEM",
            action=action.upper(),
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            reason=reason,
            previous_state=sanitize_audit_metadata(previous_state),
            new_state=sanitize_audit_metadata(new_state),
            audit_metadata=sanitize_audit_metadata(audit_metadata),
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry

    @staticmethod
    def get_audit_logs(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        action: Optional[str] = None,
        target_type: Optional[str] = None,
        actor_user_id: Optional[uuid.UUID] = None
    ) -> Tuple[int, List[Dict[str, Any]]]:
        query = select(AuditLog)
        count_query = select(func.count(AuditLog.id))

        if action:
            query = query.where(AuditLog.action.ilike(f"%{action}%"))
            count_query = count_query.where(AuditLog.action.ilike(f"%{action}%"))
        if target_type:
            query = query.where(AuditLog.target_type == target_type.upper())
            count_query = count_query.where(AuditLog.target_type == target_type.upper())
        if actor_user_id:
            query = query.where(AuditLog.actor_user_id == actor_user_id)
            count_query = count_query.where(AuditLog.actor_user_id == actor_user_id)

        total = db.scalar(count_query) or 0
        offset = (page - 1) * page_size
        logs = db.scalars(query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(page_size)).all()

        items = []
        for log in logs:
            actor_name = None
            if log.actor_user_id:
                u = db.get(Profile, log.actor_user_id)
                if u:
                    actor_name = u.full_name or u.username

            items.append({
                "id": log.id,
                "actor_user_id": log.actor_user_id,
                "actor_name": actor_name or log.role or "SYSTEM",
                "role": log.role,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "reason": log.reason,
                "previous_state": log.previous_state,
                "new_state": log.new_state,
                "audit_metadata": log.audit_metadata,
                "timestamp": log.timestamp
            })

        return total, items
