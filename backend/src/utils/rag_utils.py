from typing import Optional
from datetime import datetime, timedelta
from beanie import PydanticObjectId
from src.config.settings import get_settings
from src.models.knowledge_model import KnowledgeChunk
from src.models.chat_message_model import ChatMessage
from src.utils.embed_utils import embed_text, cosine_similarity


async def retrieve_relevant_chunks(
    query: str,
    user_type: Optional[str] = None,
    k: Optional[int] = None,
) -> list[KnowledgeChunk]:
    """Top-k chunks ranked by cosine similarity to the query embedding.

    Filters to chunks for the given user_type (or no user_type, i.e. universal advice).
    Returns [] if embedding fails or no chunks exist — caller should treat as graceful degrade.
    """
    settings = get_settings()
    top_k = k if k is not None else settings.RAG_TOP_K

    query_vec = await embed_text(query)
    if not query_vec:
        return []

    if user_type:
        chunks = await KnowledgeChunk.find({"$or": [{"user_type": user_type}, {"user_type": None}]}).to_list()
    else:
        chunks = await KnowledgeChunk.find_all().to_list()

    if not chunks:
        return []

    scored = [
        (cosine_similarity(query_vec, c.embedding), c)
        for c in chunks
        if c.embedding
    ]
    scored.sort(key=lambda t: t[0], reverse=True)
    return [c for _, c in scored[:top_k]]


def format_context(chunks: list[KnowledgeChunk]) -> str:
    """Render retrieved chunks as a labelled block to inject into the prompt."""
    if not chunks:
        return ""
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(f"[{i}] {c.title}\n{c.content}")
    return "\n\n".join(parts)


async def retrieve_relevant_history(
    query: str,
    user_id: PydanticObjectId,
    k: Optional[int] = None,
    exclude_recent_seconds: int = 60,
) -> list[ChatMessage]:
    """Retrieve this user's most semantically relevant past chat messages.

    Strictly filtered by user_id (no cross-user leakage). Excludes messages from
    the last `exclude_recent_seconds` so the current in-flight conversation
    doesn't re-retrieve itself.
    """
    settings = get_settings()
    top_k = k if k is not None else settings.RAG_TOP_K

    query_vec = await embed_text(query)
    if not query_vec:
        return []

    cutoff = datetime.utcnow() - timedelta(seconds=exclude_recent_seconds)
    messages = await ChatMessage.find(
        ChatMessage.user_id == user_id,
        ChatMessage.created_at < cutoff,
    ).to_list()

    if not messages:
        return []

    scored = [
        (cosine_similarity(query_vec, m.embedding), m)
        for m in messages
        if m.embedding
    ]
    scored.sort(key=lambda t: t[0], reverse=True)
    return [m for _, m in scored[:top_k]]


def format_history_context(messages: list[ChatMessage]) -> str:
    """Render retrieved past messages as a transcript snippet."""
    if not messages:
        return ""
    parts = []
    for m in messages:
        role_label = "User" if m.role == "user" else "RukiAI"
        parts.append(f"{role_label}: {m.content}")
    return "\n\n".join(parts)


async def persist_chat_turn(
    user_id: PydanticObjectId,
    role: str,
    content: str,
    user_type: Optional[str] = None,
) -> None:
    """Embed and store a single chat turn for future user-data RAG retrieval."""
    if not content:
        return
    embedding = await embed_text(content)
    msg = ChatMessage(
        user_id=user_id,
        role=role,
        content=content,
        user_type=user_type,
        embedding=embedding,
    )
    await msg.insert()
