from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class User(Document):
    full_name: Optional[str] = None
    email: Indexed(str, unique=True)
    hashed_password: str
    phone_number: Optional[str] = None
    currency: str = "INR"
    user_type: Optional[str] = None  # student | employed | unemployed | retired | guest
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [IndexModel([("email", ASCENDING)], unique=True)]
