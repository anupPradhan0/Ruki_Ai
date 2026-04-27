from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class KnowledgeChunk(Document):
    title: str
    content: str
    user_type: Optional[str] = None  # student | employed | unemployed | retired | None (any)
    tags: list[str] = Field(default_factory=list)
    source: Optional[str] = None
    embedding: list[float] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "knowledge_chunks"
        validate_on_save = True
        indexes = [
            IndexModel([("user_type", ASCENDING)], name="user_type_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
        ]
