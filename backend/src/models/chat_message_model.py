from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class ChatMessage(Document):
    user_id: PydanticObjectId
    role: str  # "user" | "assistant"
    content: str
    user_type: Optional[str] = None
    embedding: list[float] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chat_messages"
        validate_on_save = True
        indexes = [
            IndexModel([("user_id", ASCENDING)], name="user_id_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
        ]
