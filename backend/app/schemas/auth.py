from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or email address")
    password: str = Field(..., description="Plaintext password")

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
