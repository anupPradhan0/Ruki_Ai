"""In-memory BM25 index over all knowledge chunks in Mongo.

Built at startup and rebuilt by the ingestion script after each new batch.
Cheap to keep in RAM at the scales we expect (<100k chunks).
"""
import asyncio
import re
from typing import Optional

from rank_bm25 import BM25Okapi

from src.models.knowledge_model import KnowledgeChunk

# Finance-aware tokenizer: keep alphanumerics + ₹ + % so "80C", "₹1.5L",
# "Roth-IRA" (→ "roth", "ira") survive intact and BM25 can match them.
_TOKEN_RE = re.compile(r"[a-z0-9₹%]+", re.IGNORECASE)

_index: Optional[BM25Okapi] = None
_chunk_ids: list[str] = []
_lock = asyncio.Lock()


def tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


async def build() -> None:
    """Load every knowledge chunk from Mongo and rebuild the in-memory index."""
    global _index, _chunk_ids
    async with _lock:
        chunks = [c for c in await KnowledgeChunk.find_all().to_list() if c.vector_id]
        if not chunks:
            _index = None
            _chunk_ids = []
            print("BM25: no chunks to index yet")
            return
        _chunk_ids = [c.vector_id for c in chunks]
        tokenized = [tokenize(f"{c.title} {c.content}") for c in chunks]
        _index = BM25Okapi(tokenized)
        print(f"BM25: indexed {len(_chunk_ids)} chunks")


def search(query: str, top_k: int) -> list[tuple[str, float]]:
    """Return [(vector_id, bm25_score)] for the top-k matches. Empty if cold-start."""
    if _index is None or not _chunk_ids:
        return []
    tokens = tokenize(query)
    if not tokens:
        return []
    scores = _index.get_scores(tokens)
    ranked = sorted(zip(_chunk_ids, scores), key=lambda x: x[1], reverse=True)
    return [(cid, float(s)) for cid, s in ranked[:top_k] if s > 0]


def size() -> int:
    return len(_chunk_ids)
