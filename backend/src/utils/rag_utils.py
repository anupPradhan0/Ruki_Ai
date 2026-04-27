from typing import Optional, Sequence
from datetime import datetime, timedelta
from beanie import PydanticObjectId
from src.config.settings import get_settings
from src.models.knowledge_model import KnowledgeChunk
from src.models.chat_message_model import ChatMessage
from src.utils.embed_utils import embed_text, cosine_similarity


# ── Internal: MMR selection ─────────────────────────────────────────────────


def _mmr_select(
    scored: list[tuple[float, object, list[float]]],
    k: int,
    lambda_: float,
) -> list[tuple[float, object]]:
    """Pick k items maximizing MMR = λ·sim_to_query − (1−λ)·max_sim_to_selected.

    Input is a list of (query_similarity, doc, doc_embedding). Already filtered
    by min_score upstream. Returns [(query_similarity, doc), ...] in MMR order.
    """
    if not scored:
        return []
    if k >= len(scored) or lambda_ >= 1.0:
        # No diversity term — just return top-k by relevance.
        return [(s, d) for s, d, _ in scored[:k]]

    # `pool` is the candidates we haven't picked yet; `picked` are the chosen ones
    # along with their embeddings (so we can compute redundancy against future picks).
    pool = list(scored)
    picked: list[tuple[float, object, list[float]]] = []

    # Seed with the highest-similarity item (already sorted descending by caller).
    picked.append(pool.pop(0))

    while pool and len(picked) < k:
        best_idx = 0
        best_score = float("-inf")
        for i, (sim_q, _doc, emb) in enumerate(pool):
            max_sim_to_picked = max(
                (cosine_similarity(emb, p_emb) for _, _, p_emb in picked),
                default=0.0,
            )
            mmr = lambda_ * sim_q - (1.0 - lambda_) * max_sim_to_picked
            if mmr > best_score:
                best_score = mmr
                best_idx = i
        picked.append(pool.pop(best_idx))

    return [(sim, doc) for sim, doc, _ in picked]


# ── Knowledge RAG ───────────────────────────────────────────────────────────


async def retrieve_relevant_chunks(
    query: Optional[str] = None,
    *,
    query_vec: Optional[list[float]] = None,
    user_type: Optional[str] = None,
    k: Optional[int] = None,
    min_score: Optional[float] = None,
) -> list[KnowledgeChunk]:
    """Top-k chunks ranked by MMR-weighted similarity to the query.

    Pass `query_vec` to skip the embedding call (when the same query is being
    used for multiple retrievals in one request). Pass `query` for the simple path.
    """
    settings = get_settings()
    top_k = k if k is not None else settings.RAG_TOP_K
    threshold = min_score if min_score is not None else settings.RAG_MIN_SIMILARITY

    if query_vec is None:
        if not query or len(query.strip()) < settings.RAG_MIN_QUERY_CHARS:
            return []
        query_vec = await embed_text(query)

    if not query_vec:
        return []

    if user_type:
        chunks = await KnowledgeChunk.find(
            {"$or": [{"user_type": user_type}, {"user_type": None}]}
        ).to_list()
    else:
        chunks = await KnowledgeChunk.find_all().to_list()

    if not chunks:
        return []

    # Score every embedding-bearing chunk; drop ones below the threshold.
    scored: list[tuple[float, object, list[float]]] = []
    for c in chunks:
        if not c.embedding:
            continue
        s = cosine_similarity(query_vec, c.embedding)
        if s >= threshold:
            scored.append((s, c, c.embedding))

    if not scored:
        return []

    scored.sort(key=lambda t: t[0], reverse=True)
    selected = _mmr_select(scored, k=top_k, lambda_=settings.RAG_MMR_LAMBDA)
    return [doc for _, doc in selected]  # type: ignore[misc]


def format_context(chunks: list[KnowledgeChunk]) -> str:
    """Render retrieved chunks as a labelled block, with per-chunk truncation."""
    if not chunks:
        return ""
    settings = get_settings()
    cap = settings.RAG_MAX_CHUNK_CHARS
    parts = []
    for i, c in enumerate(chunks, 1):
        content = c.content or ""
        if cap and len(content) > cap:
            content = content[:cap].rstrip() + "…"
        parts.append(f"[{i}] {c.title}\n{content}")
    return "\n\n".join(parts)


# ── User-data RAG (per-user persisted chat history) ─────────────────────────


async def retrieve_relevant_history(
    query: Optional[str] = None,
    *,
    query_vec: Optional[list[float]] = None,
    user_id: Optional[PydanticObjectId] = None,
    k: Optional[int] = None,
    min_score: Optional[float] = None,
    exclude_recent_seconds: int = 60,
) -> list[ChatMessage]:
    """Retrieve this user's most semantically relevant past chat messages.

    Strictly filtered by user_id (no cross-user leakage). Excludes messages from
    the last `exclude_recent_seconds` so the in-flight conversation doesn't
    re-retrieve itself. Caps the scan to RAG_HISTORY_SCAN_LIMIT most-recent
    messages so memory/CPU stay bounded as history grows.
    """
    if user_id is None:
        return []

    settings = get_settings()
    top_k = k if k is not None else settings.RAG_TOP_K
    threshold = min_score if min_score is not None else settings.RAG_MIN_SIMILARITY

    if query_vec is None:
        if not query or len(query.strip()) < settings.RAG_MIN_QUERY_CHARS:
            return []
        query_vec = await embed_text(query)

    if not query_vec:
        return []

    cutoff = datetime.utcnow() - timedelta(seconds=exclude_recent_seconds)
    messages = (
        await ChatMessage.find(
            ChatMessage.user_id == user_id,
            ChatMessage.created_at < cutoff,
        )
        .sort("-created_at")
        .limit(settings.RAG_HISTORY_SCAN_LIMIT)
        .to_list()
    )

    if not messages:
        return []

    scored: list[tuple[float, object, list[float]]] = []
    for m in messages:
        if not m.embedding:
            continue
        s = cosine_similarity(query_vec, m.embedding)
        if s >= threshold:
            scored.append((s, m, m.embedding))

    if not scored:
        return []

    scored.sort(key=lambda t: t[0], reverse=True)
    selected = _mmr_select(scored, k=top_k, lambda_=settings.RAG_MMR_LAMBDA)
    return [doc for _, doc in selected]  # type: ignore[misc]


def format_history_context(messages: list[ChatMessage]) -> str:
    """Render retrieved past messages as a transcript snippet, truncated."""
    if not messages:
        return ""
    settings = get_settings()
    cap = settings.RAG_MAX_CHUNK_CHARS
    parts = []
    for m in messages:
        role_label = "User" if m.role == "user" else "RukiAI"
        content = m.content or ""
        if cap and len(content) > cap:
            content = content[:cap].rstrip() + "…"
        parts.append(f"{role_label}: {content}")
    return "\n\n".join(parts)


# ── Persistence (called from ai_utils after a chat turn) ─────────────────────


async def persist_chat_turn(
    user_id: PydanticObjectId,
    role: str,
    content: str,
    user_type: Optional[str] = None,
    embedding: Optional[Sequence[float]] = None,
) -> None:
    """Embed and store a single chat turn for future user-data RAG retrieval.

    Optional `embedding` lets the caller pass a precomputed vector (e.g. when
    the same content was just embedded for retrieval) to avoid a second call.
    """
    if not content:
        return
    vec = list(embedding) if embedding else await embed_text(content)
    msg = ChatMessage(
        user_id=user_id,
        role=role,
        content=content,
        user_type=user_type,
        embedding=vec,
    )
    await msg.insert()
