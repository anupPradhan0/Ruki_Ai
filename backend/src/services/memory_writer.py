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
from src.models.chat_message_model import ChatMessage
from src.services.qdrant_client import get_qdrant
from src.utils.embed_utils import embed_text

# Holds strong references to fire-and-forget background tasks so the event
# loop doesn't GC them mid-flight (Python 3.11+ keeps only weak refs).
_pending_tasks: set = set()


def schedule(coro) -> None:
    """Schedule a coroutine in the background with a held reference."""
    import asyncio
    task = asyncio.create_task(coro)
    _pending_tasks.add(task)
    task.add_done_callback(_pending_tasks.discard)


async def persist_turn(
    user_id: PydanticObjectId,
    role: str,
    text: str,
    user_type: Optional[str] = None,
    embedding: Optional[list[float]] = None,
    conversation_id: Optional[PydanticObjectId] = None,
    chat_message_id: Optional[PydanticObjectId] = None,
) -> Optional[str]:
    """Embed (if needed) and upsert a single chat turn into Qdrant.

    If `chat_message_id` is given, the matching Mongo `ChatMessage` row is
    updated with `vector_id` after a successful upsert — this lets us correlate
    a Qdrant point back to its source row (used by future cleanup / GDPR delete).

    Returns the Qdrant point ID, or None on any failure (silent — Mongo is the
    source of truth so a Qdrant outage never loses a turn).
    """
    if not text:
        return None

    s = get_settings()
    vector = embedding if embedding else await embed_text(text)
    if not vector:
        return None

    # Generate the UUID up front so we can write it to Mongo *before* the
    # Qdrant upsert. If the upsert fails, Mongo still has a vector_id pointing
    # at a non-existent point — but that's a no-op for retrieval (we never
    # look up by vector_id at read time) and the next migration/eval can
    # detect the orphan. The opposite ordering (Qdrant first, Mongo second)
    # creates orphan Qdrant points if Mongo update fails on retry — worse.
    point_id = str(uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    if chat_message_id is not None:
        try:
            await ChatMessage.find_one(ChatMessage.id == chat_message_id).update(
                {"$set": {"vector_id": point_id}}
            )
        except Exception as exc:
            print(f"vector_id backfill failed (continuing): {exc}")

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
    """If this user is over the cap, delete the oldest ~5% of their points.

    Caps the scroll to a multiple of the prune size so that a user already
    way over the cap doesn't make us scroll their entire history every turn.
    """
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
    # Look at at most ~10× the prune target — plenty of oldest candidates,
    # but bounded so we don't scroll all 10k+ points on every chat turn.
    scan_budget = to_drop * 10

    points: list[tuple[str, str]] = []
    next_offset = None
    while len(points) < scan_budget:
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
        if next_offset is None or not batch:
            break

    points.sort(key=lambda x: x[1])  # oldest first
    victims = [pid for pid, _ in points[:to_drop]]
    if not victims:
        return
    await client.delete(
        collection_name=s.QDRANT_MEMORY_COLLECTION,
        points_selector=PointIdsList(points=victims),
    )
