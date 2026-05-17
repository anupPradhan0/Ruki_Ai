"""Two-stage query router.

Stage A — regex shortcuts (free, ~40% of traffic).
Stage B — single-token LLM classification (only if A is ambiguous).

Returns one of: "KNOWLEDGE" | "MEMORY" | "BOTH".
"""
import asyncio
import re
from typing import Optional

from src.config.settings import get_settings

# First-person / past-reference cues → look at user memory.
_PERSONAL = re.compile(
    r"\b(my|mine|i|i'?ve|i'?m|me|earlier|before|previously|"
    r"last (time|week|month|year)|remember|told you|we (discussed|talked))\b",
    re.IGNORECASE,
)
# Generic finance-knowledge cues → look at KB.
_GENERIC = re.compile(
    r"\b(what (is|are)|explain|define|how does .* work|"
    r"tax (rate|slab|deduction)|section \d+|limit|formula|"
    r"difference between|when should|should i)\b",
    re.IGNORECASE,
)

_ROUTER_PROMPT = (
    "Classify the user query for a personal-finance assistant. "
    "Reply with exactly ONE word, no punctuation, no explanation:\n"
    "  KNOWLEDGE  → general finance question (tax, investing, budgeting concepts)\n"
    "  MEMORY     → about the user's own history, patterns, or past chats\n"
    "  BOTH       → needs general knowledge AND the user's history\n\n"
    "Query: {query}\n"
    "Answer:"
)

_VALID = {"KNOWLEDGE", "MEMORY", "BOTH"}


def _regex_route(query: str) -> Optional[str]:
    p = bool(_PERSONAL.search(query))
    g = bool(_GENERIC.search(query))
    if p and g:
        return "BOTH"
    if p:
        return "MEMORY"
    if g:
        return "KNOWLEDGE"
    return None


async def _llm_route(query: str, ai_settings: dict) -> str:
    # Lazy import keeps a clean dep graph (query_router → ai_utils would be cyclic at import time).
    from src.utils.ai_utils import _dispatch

    messages = [{"role": "user", "content": _ROUTER_PROMPT.format(query=query)}]
    text = await _dispatch(ai_settings, messages, temperature=0.0, max_tokens=4)
    cleaned = (text or "").strip().upper().split()[0] if text else ""
    return cleaned if cleaned in _VALID else get_settings().RAG_ROUTER_FALLBACK


async def route_query(query: str, ai_settings: dict) -> str:
    """Decide which retrieval pipelines to run for this query."""
    s = get_settings()
    if not query or len(query.strip()) < s.RAG_MIN_QUERY_CHARS:
        # Too short to bother routing; let the caller decide whether to skip RAG.
        return s.RAG_ROUTER_FALLBACK

    regex_hit = _regex_route(query)
    if regex_hit:
        return regex_hit

    try:
        return await asyncio.wait_for(
            _llm_route(query, ai_settings),
            timeout=s.RAG_ROUTER_TIMEOUT_SECONDS,
        )
    except Exception as exc:
        print(f"Query router fallback ({exc.__class__.__name__}): {exc}")
        return s.RAG_ROUTER_FALLBACK
