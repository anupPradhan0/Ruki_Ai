"""Upsert chat turns into the user_chat_memory Qdrant collection.

The authoritative ChatMessage row is written by `chat_message_repository.add_message`
inside the chat service. This module only touches Qdrant — never raises, so a
Qdrant outage can never lose a turn or block the LLM reply.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from beanie import PydanticObjectId
from qdrant_client.models import (
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    PointIdsList,
)

from src.config.settings import get_settings
from src.services.qdrant_client import get_qdrant
from src.utils.embed_utils import embed_text


async def persist_turn(
    user_id: PydanticObjectId,
    role: str,
    text: str,
    user_type: Optional[str] = None,
    embedding: Optional[list[float]] = None,
    conversation_id: Optional[PydanticObjectId] = None,
) -> Optional[str]:
    """Embed (if needed) and upsert a single chat turn into Qdrant.

    Pass `embedding` when the same text was just embedded for retrieval — saves
    one Ollama round-trip per turn. Returns the Qdrant point ID, or None on
    any failure (silent — caller doesn't need to handle, Mongo still has the turn).
    """
    if not text:
        return None

    s = get_settings()
    vector = embedding if embedding else await embed_text(text)
    if not vector:
        return None

    point_id = str(uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        await get_qdrant().upsert(
            collection_name=s.QDRANT_MEMORY_COLLECTION,
            points=[
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "user_id": str(user_id),
                        "conversation_id": str(conversation_id) if conversation_id else None,
                        "role": role,
                        "text": text,
                        "user_type": user_type,
                        "created_at": now_iso,
                        "last_seen_at": now_iso,
                    },
                )
            ],
        )
    except Exception as exc:
        print(f"Memory upsert failed: {exc}")
        return None

    # Best-effort prune; never raise.
    try:
        await _prune_if_needed(str(user_id))
    except Exception as exc:
        print(f"Memory prune failed: {exc}")

    return point_id


async def _prune_if_needed(user_id: str) -> None:
    """If this user is over the cap, delete the oldest 5% of their points."""
    s = get_settings()
    client = get_qdrant()
    qfilter = Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))])

    count = (
        await client.count(collection_name=s.QDRANT_MEMORY_COLLECTION, count_filter=qfilter)
    ).count
    cap = s.RAG_MEMORY_MAX_PER_USER
    if count <= cap:
        return

    to_drop = max(1, int(cap * 0.05))
    points: list[tuple[str, str]] = []
    next_offset = None
    while True:
        batch, next_offset = await client.scroll(
            collection_name=s.QDRANT_MEMORY_COLLECTION,
            scroll_filter=qfilter,
            with_payload=["created_at"],
            with_vectors=False,
            limit=512,
            offset=next_offset,
        )
        for pt in batch:
            payload = pt.payload or {}
            points.append((str(pt.id), payload.get("created_at") or ""))
        if next_offset is None:
            break

    points.sort(key=lambda x: x[1])  # oldest first
    victims = [pid for pid, _ in points[:to_drop]]
    if not victims:
        return
    await client.delete(
        collection_name=s.QDRANT_MEMORY_COLLECTION,
        points_selector=PointIdsList(points=victims),
    )
