from typing import List, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import Profile
from app.auth.service import validate_session_token

security = HTTPBearer(auto_error=False)

def get_token_from_request(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    Extracts raw session token from Bearer header or custom X-Session-Token header.
    """
    if credentials and credentials.credentials:
        return credentials.credentials
    # Fallback check X-Session-Token header
    token_header = request.headers.get("X-Session-Token")
    if token_header:
        return token_header
    return None

def get_current_user(
    raw_token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db)
) -> Profile:
    """
    Validates token and returns the current authenticated Profile.
    Raises HTTP 401 Unauthorized if unauthenticated or expired.
    """
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid session token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    profile = validate_session_token(db, raw_token)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return profile

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: Profile = Depends(get_current_user)) -> Profile:
        if not current_user.role or current_user.role.name not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(self.allowed_roles)}"
            )
        return current_user

require_soc_analyst = RoleChecker(["SOC_ANALYST"])
require_alert_source = RoleChecker(["ALERT_SOURCE"])
