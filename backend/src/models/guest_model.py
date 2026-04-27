from datetime import datetime
from typing import Optional
from beanie import Document, before_event, Replace, SaveChanges, Update
from pydantic import Field, ConfigDict
from pymongo import IndexModel, ASCENDING

from src.models.enums import Currency


class Guest(Document):
    """Anonymous guest session — short-lived (24h JWT)."""

    full_name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[str] = Field(default=None, max_length=120)
    hashed_password: Optional[str] = None
    phone_number: Optional[str] = Field(default=None, max_length=20)
    currency: Currency = Currency.INR
    user_type: str = "guest"
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
        name = "guests"
        validate_on_save = True
        use_state_management = True
        indexes = [
            IndexModel(
                [("created_at", ASCENDING)],
                expireAfterSeconds=60 * 60 * 24 * 2,  # auto-purge after 2 days
                name="ttl_created_at",
            ),
        ]
