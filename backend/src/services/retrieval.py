"""Public retrieval API used by the chat service.

Two pipelines:
  - retrieve_knowledge(): BM25 + vector → RRF → MMR re-rank
  - retrieve_memory():    vector + time-decay → MMR re-rank
"""
from datetime import datetime, timezone
from math import pow
from typing import Optional

from qdrant_client.models import (
    FieldCondition,
    Filter,
    IsEmptyCondition,
    MatchValue,
    PayloadField,
)

from src.config.settings import get_settings
from src.services import bm25_index
from src.services.qdrant_client import get_qdrant
from src.utils.embed_utils import cosine_similarity


def _as_vector(raw) -> Optional[list[float]]:
    """Qdrant returns `.vector` as list (unnamed vectors) OR dict (named).
    Our collections use unnamed vectors, but be defensive — version skew has
    bitten this before."""
    if raw is None:
        return None
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        # Unnamed vector lives under the empty-string key.
        return raw.get("") or next(iter(raw.values()), None)
    return None


# ── MMR (Maximal Marginal Relevance) ───────────────────────────────────────


def _mmr_select(
    candidates: list[tuple[float, dict, list[float]]],
    k: int,
    lambda_: float,
) -> list[tuple[float, dict]]:
    """Pick k items maximising MMR = λ·sim_to_query − (1−λ)·max_sim_to_picked.

    `candidates` is a list of (query_similarity, payload, vector), sorted
    descending by query_similarity.
    """
    if not candidates:
        return []
    if k >= len(candidates) or lambda_ >= 1.0:
        return [(s, p) for s, p, _ in candidates[:k]]

    pool = list(candidates)
    picked: list[tuple[float, dict, list[float]]] = [pool.pop(0)]

    while pool and len(picked) < k:
        best_idx = 0
        best_score = float("-inf")
        for i, (sim_q, _p, vec) in enumerate(pool):
            redundancy = max(
                (cosine_similarity(vec, p_vec) for _, _, p_vec in picked),
                default=0.0,
            )
            score = lambda_ * sim_q - (1.0 - lambda_) * redundancy
            if score > best_score:
                best_score = score
                best_idx = i
        picked.append(pool.pop(best_idx))

    return [(s, p) for s, p, _ in picked]


# ── RRF (Reciprocal Rank Fusion) ───────────────────────────────────────────


def _rrf(rankings: list[list[str]], k: int) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


# ── Knowledge pipeline ─────────────────────────────────────────────────────


async def retrieve_knowledge(
    query: str,
    query_vec: Optional[list[float]] = None,
    user_type: Optional[str] = None,
) -> list[dict]:
    """Hybrid BM25 + vector retrieval, RRF merged, MMR re-ranked.

    Returns payload dicts (with title/content/source/...). Empty on any failure.
    """
    s = get_settings()
    if not query or not query_vec:
        return []

    pool = s.RAG_CANDIDATE_POOL

    # Leg 1 — BM25 (cheap, in-memory).
    bm25_hits = bm25_index.search(query, pool)
    bm25_ids = [cid for cid, _ in bm25_hits]

    # Leg 2 — Qdrant vector search, optionally filtered by user_type
    # (matches the user's bucket OR universal chunks with user_type=None).
    qfilter = None
    if user_type:
        # "this user's bucket" OR "universal" (user_type is null / missing).
        # `IsEmptyCondition` matches null, missing field, and empty array — which
        # is the only correct way to find the None-tagged universal chunks
        # (Qdrant's MatchValue rejects None).
        qfilter = Filter(
            should=[
                FieldCondition(key="user_type", match=MatchValue(value=user_type)),
                IsEmptyCondition(is_empty=PayloadField(key="user_type")),
            ]
        )

    try:
        vector_hits = await get_qdrant().search(
            collection_name=s.QDRANT_KNOWLEDGE_COLLECTION,
            query_vector=query_vec,
            limit=pool,
            with_payload=True,
            with_vectors=True,
            query_filter=qfilter,
        )
    except Exception as exc:
        print(f"Qdrant knowledge search failed: {exc}")
        vector_hits = []

    vector_ids = [str(h.id) for h in vector_hits]
    vector_by_id = {str(h.id): h for h in vector_hits}

    if not bm25_ids and not vector_ids:
        return []

    # Merge with RRF.
    merged = _rrf([bm25_ids, vector_ids], k=s.RAG_RRF_K)
    if not merged:
        return []

    # Build MMR candidate list. For RRF-only IDs without vectors fetched
    # (BM25-only winners), pull them from Qdrant in one round trip.
    missing_ids = [cid for cid, _ in merged if cid not in vector_by_id]
    if missing_ids:
        try:
            fetched = await get_qdrant().retrieve(
                collection_name=s.QDRANT_KNOWLEDGE_COLLECTION,
                ids=missing_ids,
                with_payload=True,
                with_vectors=True,
            )
            for pt in fetched:
                vector_by_id[str(pt.id)] = pt
        except Exception as exc:
            print(f"Qdrant retrieve for BM25 winners failed: {exc}")

    # IMPORTANT: keep RRF order — do NOT re-sort by cosine. A BM25-only winner
    # may have a weak vector-cosine score; sorting by cosine would push it to
    # the back and MMR's seed (pool.pop(0)) would skip it. By preserving the
    # RRF ranking, MMR seeds with the actual top hybrid hit, then diversifies
    # the rest using the cosine term against the picked set.
    mmr_candidates: list[tuple[float, dict, list[float]]] = []
    for cid, rrf_score in merged:
        pt = vector_by_id.get(cid)
        if pt is None or pt.payload is None:
            continue
        vec = _as_vector(pt.vector)
        if vec is None:
            continue
        mmr_candidates.append((rrf_score, pt.payload, vec))

    chosen = _mmr_select(mmr_candidates, k=s.RAG_KNOWLEDGE_TOP_K, lambda_=s.RAG_MMR_LAMBDA)
    return [payload for _, payload in chosen]


# ── Memory pipeline ────────────────────────────────────────────────────────


def _time_decay(created_at_iso: str, half_life_days: int) -> float:
    try:
        ts = datetime.fromisoformat(created_at_iso)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
    except Exception:
        return 1.0
    age_days = max(0.0, (datetime.now(timezone.utc) - ts).total_seconds() / 86400.0)
    return pow(0.5, age_days / max(1, half_life_days))


async def retrieve_memory(
    query: str,
    query_vec: Optional[list[float]],
    user_id: str,
    exclude_conversation_id: Optional[str] = None,
) -> list[dict]:
    """Per-user vector search with time-decay reweighting and MMR re-rank.

    `exclude_conversation_id`: if given, the current conversation's turns are
    filtered out so the model isn't fed back the just-said messages as
    "relevant memory" — that produced awkward "you said earlier:" loops.
    """
    s = get_settings()
    if not query or not query_vec or not user_id:
        return []

    must_not = []
    if exclude_conversation_id:
        must_not.append(
            FieldCondition(
                key="conversation_id",
                match=MatchValue(value=exclude_conversation_id),
            )
        )
    qfilter = Filter(
        must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))],
        must_not=must_not or None,
    )

    try:
        hits = await get_qdrant().search(
            collection_name=s.QDRANT_MEMORY_COLLECTION,
            query_vector=query_vec,
            limit=s.RAG_CANDIDATE_POOL,
            with_payload=True,
            with_vectors=True,
            query_filter=qfilter,
        )
    except Exception as exc:
        print(f"Qdrant memory search failed: {exc}")
        return []

    # Apply time-decay; also drop the in-flight turn if it sneaks in.
    now = datetime.now(timezone.utc)
    cutoff_seconds = s.RAG_MEMORY_EXCLUDE_RECENT_SECONDS

    decayed: list[tuple[float, dict, list[float]]] = []
    for h in hits:
        payload = h.payload or {}
        created = payload.get("created_at")
        if created:
            try:
                ts = datetime.fromisoformat(created)
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                if (now - ts).total_seconds() < cutoff_seconds:
                    continue
            except Exception:
                pass
        weight = _time_decay(created, s.RAG_MEMORY_HALF_LIFE_DAYS) if created else 1.0
        score = (h.score or 0.0) * weight
        vec = _as_vector(h.vector)
        if vec is None:
            continue
        decayed.append((score, payload, vec))

    decayed.sort(key=lambda t: t[0], reverse=True)
    chosen = _mmr_select(decayed, k=s.RAG_MEMORY_TOP_K, lambda_=s.RAG_MMR_LAMBDA)
    return [payload for _, payload in chosen]


# ── Prompt rendering helpers ───────────────────────────────────────────────


def format_knowledge(payloads: list[dict]) -> str:
    if not payloads:
        return ""
    s = get_settings()
    cap = s.RAG_MAX_CHUNK_CHARS
    parts = []
    for i, p in enumerate(payloads, 1):
        title = p.get("title") or p.get("source") or f"Chunk {i}"
        text = (p.get("text") or "").strip()
        if cap and len(text) > cap:
            text = text[:cap].rstrip() + "…"
        parts.append(f"[{i}] {title}\n{text}")
    return "\n\n".join(parts)


def format_memory(payloads: list[dict]) -> str:
    if not payloads:
        return ""
    s = get_settings()
    cap = s.RAG_MAX_CHUNK_CHARS
    parts = []
    for p in payloads:
        role = "User" if p.get("role") == "user" else "RukiAI"
        text = (p.get("text") or "").strip()
        if cap and len(text) > cap:
            text = text[:cap].rstrip() + "…"
        parts.append(f"{role}: {text}")
    return "\n\n".join(parts)
