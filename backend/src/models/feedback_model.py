from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field, EmailStr, ConfigDict
from pymongo import IndexModel, ASCENDING, DESCENDING


class Feedback(Document):
    name: str = Field(min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    message: str = Field(min_length=1, max_length=2000)
    is_public: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    class Settings:
        name = "feedbacks"
        validate_on_save = True
        indexes = [
            IndexModel([("created_at", DESCENDING)], name="created_at_desc_idx"),
            IndexModel([("is_public", ASCENDING)], name="is_public_idx"),
        ]
