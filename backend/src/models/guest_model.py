from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field


class Guest(Document):
    full_name: Optional[str] = None
    email: Optional[str] = None
    hashed_password: Optional[str] = None
    phone_number: Optional[str] = None
    currency: str = "INR"
    user_type: str = "guest"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "guests"
