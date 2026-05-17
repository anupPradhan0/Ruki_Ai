from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class KnowledgeChunk(Document):
    """Text-only mirror of a Qdrant point in `finance_knowledge`.

    Vectors live in Qdrant; `vector_id` matches the Qdrant point ID and is
    reused as the stable BM25 doc identifier so RRF can merge both rankings.
    Both `vector_id` and `chunk_hash` are sparse-unique — a row missing them
    is legacy/dirty and just doesn't participate in retrieval.
    """
    title: str
    content: str
    user_type: Optional[str] = None  # student | employed | unemployed | retired | None (any)
    tags: list[str] = Field(default_factory=list)
    category: Optional[str] = None
    source: Optional[str] = None
    vector_id: Optional[str] = None
    chunk_hash: Optional[str] = None  # sha256(source::text) — keeps re-ingestion idempotent
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "knowledge_chunks"
        validate_on_save = True
        indexes = [
            IndexModel([("user_type", ASCENDING)], name="user_type_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
            IndexModel(
                [("vector_id", ASCENDING)],
                name="vector_id_idx", unique=True, sparse=True,
            ),
            IndexModel(
                [("chunk_hash", ASCENDING)],
                name="chunk_hash_idx", unique=True, sparse=True,
            ),
        ]
