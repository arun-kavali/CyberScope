from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or email address")
    password: str = Field(..., description="Plaintext password")

class SignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255, description="User's full name")
    username: str = Field(..., min_length=3, max_length=100, description="Desired username")
    email: str = Field(..., min_length=5, max_length=255, description="User's email address")
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    role: str = Field(..., description="Desired role: SOC_ANALYST or ALERT_SOURCE")

class UserProfileResponse(BaseModel):
    id: UUID
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserProfileResponse

class LogoutResponse(BaseModel):
    message: str = "Session successfully revoked"
