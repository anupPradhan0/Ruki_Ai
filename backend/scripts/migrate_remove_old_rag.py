"""One-shot migration: move embeddings out of Mongo into Qdrant, drop the
old `embedding` field, and ensure every old `KnowledgeChunk` / `ChatMessage`
has a `vector_id` pointing at its Qdrant point.

Safe to re-run. Skips rows that have already been migrated.

Run from the backend dir:
    python scripts/migrate_remove_old_rag.py
"""
import asyncio
import sys
from datetime import timezone
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from qdrant_client.models import PointStruct

from src.config.settings import get_settings
from src.db.database import init_db
from src.models.chat_message_model import ChatMessage
from src.models.knowledge_model import KnowledgeChunk
from src.services.qdrant_client import get_qdrant, init_qdrant


def _hash(source: str, text: str) -> str:
    return sha256(f"{source}::{text}".encode("utf-8")).hexdigest()


async def _flush_knowledge_batch(client, coll, points, updates, collection_name) -> None:
    """Write Mongo `vector_id` BEFORE the Qdrant upsert. If the upsert fails
    on retry, the next run will see the same vector_id in Mongo and skip the
    row — preventing orphan Qdrant points from accumulating."""
    if not points:
        return
    for _id, upd in updates:
        await coll.update_one({"_id": _import_objectid(_id)}, {"$set": upd})
    await client.upsert(collection_name=collection_name, points=points)


async def _migrate_knowledge() -> None:
    s = get_settings()
    client = get_qdrant()
    # Use the raw motor collection so we can read the legacy `embedding` field
    # that's no longer on the Beanie model.
    coll = KnowledgeChunk.get_motor_collection()
    cursor = coll.find({})
    total = migrated = skipped = 0
    points: list[PointStruct] = []
    updates: list[tuple[str, dict]] = []

    async for row in cursor:
        total += 1
        if row.get("vector_id"):
            skipped += 1
            continue
        vec = row.get("embedding") or []
        if not vec:
            skipped += 1
            continue
        vector_id = str(uuid4())
        chunk_hash = row.get("chunk_hash") or _hash(
            row.get("source") or "legacy", row.get("content") or ""
        )
        points.append(PointStruct(
            id=vector_id,
            vector=vec,
            payload={
                "title": row.get("title"),
                "text": row.get("content"),
                "user_type": row.get("user_type"),
                "category": row.get("category"),
                "tags": row.get("tags", []),
                "source": row.get("source"),
                "chunk_hash": chunk_hash,
            },
        ))
        updates.append((str(row["_id"]), {"vector_id": vector_id, "chunk_hash": chunk_hash}))
        migrated += 1
        if len(points) >= 256:
            await _flush_knowledge_batch(client, coll, points, updates, s.QDRANT_KNOWLEDGE_COLLECTION)
            points.clear()
            updates.clear()

    await _flush_knowledge_batch(client, coll, points, updates, s.QDRANT_KNOWLEDGE_COLLECTION)
    await coll.update_many({"embedding": {"$exists": True}}, {"$unset": {"embedding": ""}})
    print(f"  knowledge: {migrated} migrated, {skipped} skipped, {total} total")


async def _flush_memory_batch(client, coll, points, updates, collection_name) -> None:
    if not points:
        return
    for _id, vid in updates:
        await coll.update_one({"_id": _import_objectid(_id)}, {"$set": {"vector_id": vid}})
    await client.upsert(collection_name=collection_name, points=points)


async def _migrate_memory() -> None:
    s = get_settings()
    client = get_qdrant()
    coll = ChatMessage.get_motor_collection()
    cursor = coll.find({})
    total = migrated = skipped = 0
    points: list[PointStruct] = []
    updates: list[tuple[str, str]] = []

    async for row in cursor:
        total += 1
        if row.get("vector_id"):
            skipped += 1
            continue
        vec = row.get("embedding") or []
        if not vec:
            skipped += 1
            continue
        created = row.get("created_at")
        if created is None:
            # Qdrant's datetime payload index will reject an empty string and
            # could fail the whole batch — fall back to "now" so the point
            # still indexes (decay will treat it as fresh, which is fine for
            # an unknown timestamp).
            created = datetime.now(timezone.utc)
        elif created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        created_iso = created.isoformat()
        vector_id = str(uuid4())
        points.append(PointStruct(
            id=vector_id,
            vector=vec,
            payload={
                "user_id": str(row.get("user_id")),
                "conversation_id": str(row.get("conversation_id")) if row.get("conversation_id") else None,
                "role": row.get("role"),
                "text": row.get("content"),
                "user_type": row.get("user_type"),
                "created_at": created_iso,
                "last_seen_at": created_iso,
            },
        ))
        updates.append((str(row["_id"]), vector_id))
        migrated += 1
        if len(points) >= 256:
            await _flush_memory_batch(client, coll, points, updates, s.QDRANT_MEMORY_COLLECTION)
            points.clear()
            updates.clear()

    await _flush_memory_batch(client, coll, points, updates, s.QDRANT_MEMORY_COLLECTION)
    await coll.update_many({"embedding": {"$exists": True}}, {"$unset": {"embedding": ""}})
    print(f"  memory: {migrated} migrated, {skipped} skipped, {total} total")


def _import_objectid(s: str):
    from bson import ObjectId
    return ObjectId(s)


async def main() -> None:
    await init_db()
    await init_qdrant()
    print("Migrating KnowledgeChunk embeddings → Qdrant…")
    await _migrate_knowledge()
    print("Migrating ChatMessage embeddings → Qdrant…")
    await _migrate_memory()
    print("Done. Run `python scripts/ingest_finance_docs.py` if you also want fresh seed content.")


if __name__ == "__main__":
    asyncio.run(main())
