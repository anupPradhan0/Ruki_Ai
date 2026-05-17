"""Qdrant async client singleton + collection/index initialisation.

Called once from the FastAPI lifespan. Idempotent: safe to re-run on every
boot — only creates collections/indexes that don't already exist.
"""
from typing import Optional

from qdrant_client import AsyncQdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import Distance, PayloadSchemaType, VectorParams

from src.config.settings import get_settings

_client: Optional[AsyncQdrantClient] = None


def get_qdrant() -> AsyncQdrantClient:
    """Return the process-wide Qdrant async client. Lazily constructed."""
    global _client
    if _client is None:
        _client = AsyncQdrantClient(url=get_settings().QDRANT_URL)
    return _client


async def _ensure_collection(client: AsyncQdrantClient, name: str, size: int) -> None:
    existing = {col.name for col in (await client.get_collections()).collections}
    if name not in existing:
        await client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=size, distance=Distance.COSINE),
        )


async def _ensure_payload_index(
    client: AsyncQdrantClient,
    collection: str,
    field: str,
    schema: PayloadSchemaType,
) -> None:
    # create_payload_index is idempotent in newer Qdrant versions but older
    # ones raise on duplicate — swallow that specific case.
    try:
        await client.create_payload_index(collection, field, schema)
    except UnexpectedResponse as exc:
        if "already exists" not in str(exc).lower():
            raise


async def init_qdrant() -> None:
    """Create collections + payload indexes. Never raises — logs and continues
    so the API still boots in degraded mode if Qdrant is down."""
    s = get_settings()
    try:
        c = get_qdrant()
        await _ensure_collection(c, s.QDRANT_KNOWLEDGE_COLLECTION, s.QDRANT_VECTOR_SIZE)
        await _ensure_collection(c, s.QDRANT_MEMORY_COLLECTION, s.QDRANT_VECTOR_SIZE)
        await _ensure_payload_index(c, s.QDRANT_MEMORY_COLLECTION, "user_id", PayloadSchemaType.KEYWORD)
        await _ensure_payload_index(c, s.QDRANT_MEMORY_COLLECTION, "created_at", PayloadSchemaType.DATETIME)
        await _ensure_payload_index(c, s.QDRANT_KNOWLEDGE_COLLECTION, "user_type", PayloadSchemaType.KEYWORD)
        await _ensure_payload_index(c, s.QDRANT_KNOWLEDGE_COLLECTION, "category", PayloadSchemaType.KEYWORD)
        print("✅ Qdrant initialised")
    except Exception as exc:
        print(f"⚠️  Qdrant init failed — retrieval will degrade to no-op: {exc}")


async def qdrant_healthy() -> bool:
    try:
        await get_qdrant().get_collections()
        return True
    except Exception:
        return False
