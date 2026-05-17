from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING


class ChatMessage(Document):
    """Authoritative log of every chat turn.

    Vectors for retrieval live in Qdrant (`user_chat_memory`). `vector_id` is
    the Qdrant point ID for the matching memory point, or None if persistence
    to Qdrant failed (the Mongo write still succeeds — we never lose a turn).
    """
    user_id: PydanticObjectId
    conversation_id: Optional[PydanticObjectId] = None
    role: str  # "user" | "assistant"
    content: str
    user_type: Optional[str] = None
    vector_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chat_messages"
        validate_on_save = True
        indexes = [
            IndexModel([("user_id", ASCENDING)], name="user_id_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
            IndexModel(
                [("user_id", ASCENDING), ("created_at", DESCENDING)],
                name="user_recent_idx",
            ),
            IndexModel(
                [("conversation_id", ASCENDING), ("created_at", ASCENDING)],
                name="conversation_created_idx",
            ),
        ]
