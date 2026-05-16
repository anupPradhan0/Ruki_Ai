from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING


class Conversation(Document):
    user_id: PydanticObjectId
    title: str = Field(max_length=200)
    user_type: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "conversations"
        validate_on_save = True
        indexes = [
            IndexModel([("user_id", ASCENDING), ("updated_at", DESCENDING)], name="user_updated_idx"),
        ]
