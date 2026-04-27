from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class SignupRequest(BaseModel):
    full_name: Optional[str] = None
    email: EmailStr
    password: str = Field(min_length=6)
    phone_number: Optional[str] = None
    currency: str = "INR"
    user_type: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message: str
    user_id: Optional[str] = None
    user_type: Optional[str] = None
