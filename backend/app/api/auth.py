from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import Profile
from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse, LogoutResponse
from app.auth.service import authenticate_user, create_user_session, revoke_session_token
from app.auth.dependencies import get_current_user, get_token_from_request

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate credentials for SOC_ANALYST or ALERT_SOURCE users.
    Returns session token and safe profile details upon success.
    """
    profile = authenticate_user(db, payload.username, payload.password)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    raw_token = create_user_session(db, profile)
    user_response = UserProfileResponse(
        id=profile.id,
        username=profile.username,
        email=profile.email,
        full_name=profile.full_name,
        role=profile.role.name if profile.role else "SOC_ANALYST",
        is_active=profile.is_active
    )

    return TokenResponse(
        token=raw_token,
        token_type="bearer",
        user=user_response
    )

@router.post("/logout", response_model=LogoutResponse, status_code=status.HTTP_200_OK)
async def logout(
    raw_token: str = Depends(get_token_from_request),
    db: Session = Depends(get_db)
):
    """
    Revoke and invalidate the current session token.
    """
    if raw_token:
        revoke_session_token(db, raw_token)
    return LogoutResponse(message="Session successfully revoked")

@router.get("/me", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: Profile = Depends(get_current_user)):
    """
    Retrieve authenticated user profile and role information.
    """
    return UserProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.name if current_user.role else "SOC_ANALYST",
        is_active=current_user.is_active
    )
