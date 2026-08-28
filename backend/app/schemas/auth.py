from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    center_code: str = Field(..., description="Center identifier code, e.g. RJP-01")
    username: str = Field(..., description="Username of coordinator/admin")
    password: str = Field(..., description="Plaintext password")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    center_id: int
    center_name: str


class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    center_id: Optional[int] = None
    center_name: Optional[str] = None
