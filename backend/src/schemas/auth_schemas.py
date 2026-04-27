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
