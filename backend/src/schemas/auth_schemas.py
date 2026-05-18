from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from src.models.enums import Currency, UserType


class SignupRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    phone_number: Optional[str] = Field(default=None, max_length=20)
    currency: Currency = Currency.INR
    user_type: Optional[UserType] = None

    model_config = ConfigDict(use_enum_values=True, str_strip_whitespace=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = ConfigDict(str_strip_whitespace=True)


class AuthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message: str
    user_id: Optional[str] = None
    user_type: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    model_config = ConfigDict(str_strip_whitespace=True)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=512)
    new_password: str = Field(min_length=6, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class MessageResponse(BaseModel):
    message: str


class MeResponse(BaseModel):
    user_id: str
    email: str
    full_name: Optional[str] = None
    user_type: Optional[str] = None
    email_verified: bool = False
