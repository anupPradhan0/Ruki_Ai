"""Shared Pydantic response shapes used across all domains."""
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

from src.models.enums import Currency, UserType


class MessageResponse(BaseModel):
    """Generic success response for write operations (POST/PUT)."""
    message: str
    user_type: Optional[UserType] = None

    model_config = ConfigDict(use_enum_values=True)


class UserSummary(BaseModel):
    """Slim user representation embedded inside dashboard responses."""
    email: EmailStr
    full_name: Optional[str] = None
    currency: Currency

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
