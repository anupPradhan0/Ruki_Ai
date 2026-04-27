from datetime import datetime
from typing import Optional
from beanie import Document, before_event, Insert, Replace, SaveChanges, Update
from pydantic import EmailStr, Field, ConfigDict
from pymongo import IndexModel, ASCENDING

from src.models.enums import Currency, UserType


class User(Document):
    full_name: Optional[str] = Field(default=None, max_length=100)
    email: EmailStr
    hashed_password: str = Field(min_length=20)  # bcrypt hashes are ~60 chars
    phone_number: Optional[str] = Field(default=None, max_length=20)
    currency: Currency = Currency.INR
    user_type: Optional[UserType] = None
    ai_provider: str = "local"
    ai_model: str = "gemma4:e2b"
    ai_api_key: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )

    @before_event(Replace, SaveChanges, Update)
    async def _touch_updated_at(self) -> None:
        self.updated_at = datetime.utcnow()

    class Settings:
        name = "users"
        validate_on_save = True
        use_state_management = True
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True, name="email_unique"),
            IndexModel([("user_type", ASCENDING)], name="user_type_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
        ]
