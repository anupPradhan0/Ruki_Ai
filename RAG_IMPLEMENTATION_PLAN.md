# RAG Implementation Plan — v2

**Privacy-First AI Finance Tracker (RukiAI)**

> **Scope of this plan:** Replace the current in-Mongo cosine-similarity RAG (`src/utils/rag_utils.py`, `embedding` fields on `KnowledgeChunk` / `ChatMessage`) with a Qdrant-backed hybrid RAG. Two independent pipelines, one shared vector DB, no extra infra beyond Qdrant.

---

## 0. What This Replaces

| Existing (to remove) | Replacement |
|---|---|
| `src/utils/rag_utils.py` (MMR over in-process cosine scan) | `src/services/retrieval.py` (Qdrant + BM25 + RRF) |
| `embedding: list[float]` on `KnowledgeChunk` and `ChatMessage` | Vectors live in Qdrant; Mongo keeps text only |
| `RAG_MIN_SIMILARITY`, `RAG_MMR_LAMBDA`, `RAG_HISTORY_SCAN_LIMIT` settings | Replaced by Qdrant-scoped settings (see §11) |
| `KnowledgeChunk.embedding`, `ChatMessage.embedding` Beanie fields | Drop the field; add `vector_id: str` (UUID matching the Qdrant point ID) |

Keep: `embed_utils.embed_text`, `ai_utils._dispatch`, all provider routing, `_build_chat_system`, `_build_advice_prompt`.

---

## 1. Decision: Hybrid RAG — Two Independent Pipelines

| | Pipeline 1 — Knowledge | Pipeline 2 — User Memory |
|---|---|---|
| **Qdrant collection** | `finance_knowledge` | `user_chat_memory` |
| **Scope** | Shared across all users | Per-user (filter on `user_id` payload) |
| **Retrieval** | BM25 + Vector → RRF → MMR re-rank | Vector + time-decay → MMR re-rank |
| **Why hybrid for KB** | Finance is keyword-heavy (`80C`, `PPF`, `₹1.5 lakh`, `ELSS`); pure vectors miss exact terms | n/a |
| **Why decay for memory** | n/a | Recent chats outweigh stale ones; user context drifts |

> **Why not MongoDB vector search:** Atlas required (cloud); local Docker Mongo 7 has no `$vectorSearch`. Qdrant runs in one container, supports payload filters, and is purpose-built for this workload.

---

## 2. Stack Additions

### 2.1 New Docker service

Add to `docker-compose.yml` (keep your existing env_file + network pattern):

```yaml
  qdrant:
    image: qdrant/qdrant:v1.12.4
    container_name: rukiai_qdrant
    # No host port exposed by default — backend reaches it on the compose network.
    # Uncomment to use the Qdrant dashboard from the host (http://localhost:6333/dashboard).
    # ports:
    #   - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

volumes:
  mongo_data:
  qdrant_data:
```

Add to `backend` service:

```yaml
    environment:
      ...
      qdrant_url: http://qdrant:6333
    depends_on:
      mongo:
        condition: service_healthy
      qdrant:
        condition: service_started
```

### 2.2 Python deps (add to `backend/requirements.txt`)

```
qdrant-client>=1.12.0
rank-bm25>=0.2.2
langchain-text-splitters>=0.3.0
```

(Skip `tiktoken` — it's only useful if you're token-budgeting against OpenAI tokenizers; chunk by chars instead.)

---

## 3. Settings additions (`src/config/settings.py`)

Append to the existing `Settings` class:

```python
    # Qdrant
    QDRANT_URL: str = "http://qdrant:6333"
    QDRANT_KNOWLEDGE_COLLECTION: str = "finance_knowledge"
    QDRANT_MEMORY_COLLECTION: str = "user_chat_memory"
    QDRANT_VECTOR_SIZE: int = 768  # nomic-embed-text

    # Retrieval
    RAG_MIN_QUERY_CHARS: int = 12
    RAG_KNOWLEDGE_TOP_K: int = 5           # final chunks returned from KB pipeline
    RAG_MEMORY_TOP_K: int = 3              # final chat turns returned from memory pipeline
    RAG_CANDIDATE_POOL: int = 20           # candidates per leg before RRF/MMR
    RAG_RRF_K: int = 60                    # RRF constant — standard default
    RAG_MMR_LAMBDA: float = 0.7
    RAG_MEMORY_HALF_LIFE_DAYS: int = 30    # time-decay half-life
    RAG_MEMORY_MAX_PER_USER: int = 10_000  # hard cap; oldest pruned beyond this

    # Query router
    RAG_ROUTER_TIMEOUT_SECONDS: float = 4.0
    RAG_ROUTER_FALLBACK: str = "BOTH"      # if router fails, run both pipelines

    # Ingestion
    RAG_CHUNK_SIZE: int = 512
    RAG_CHUNK_OVERLAP: int = 64            # ~12% — slightly above the original 10%
```

Remove (deprecated): `RAG_MIN_SIMILARITY`, `RAG_HISTORY_SCAN_LIMIT`, `RAG_TOP_K`, `RAG_MAX_CHUNK_CHARS` *(replaced by per-pipeline caps)*.

---

## 4. Qdrant collections

### 4.1 `finance_knowledge` payload
```
chunk_id      str    # stable hash of source+text — used for upsert dedup
source        str    # filename, URL, or "seed"
category      str    # "tax" | "investing" | "insurance" | "budgeting" | ...
user_type     str?   # "student" | "employed" | "unemployed" | "retired" | None (=all)
title         str
text          str
tokens        list[str]  # pre-tokenized for BM25 reuse
created_at    iso8601
```

### 4.2 `user_chat_memory` payload
```
user_id        str   # MUST be string repr of PydanticObjectId
conversation_id str?
role           "user" | "assistant"
text           str
created_at     iso8601
last_seen_at   iso8601  # updated on every retrieval — drives LRU prune
```

Both collections: `VectorParams(size=768, distance=COSINE)`.

**Required Qdrant payload indexes** (created at startup — without these, filtered search is a full scan):

```python
await client.create_payload_index("user_chat_memory", "user_id", "keyword")
await client.create_payload_index("user_chat_memory", "created_at", "datetime")
await client.create_payload_index("finance_knowledge", "user_type", "keyword")
await client.create_payload_index("finance_knowledge", "category", "keyword")
```

---

## 5. Architecture flow

```
User message
   │
   ▼
[1] Cheap regex pre-filter (greeting, "ok", "thanks", < RAG_MIN_QUERY_CHARS)
   │   └─ if matches → skip RAG entirely, go straight to LLM with profile only
   ▼
[2] Embed user message ONCE  → query_vec  (reused for both pipelines + persistence)
   │
   ▼
[3] Query router (LLM, 1 token output, 4s timeout)
   │   ├─ KNOWLEDGE → pipeline 1 only
   │   ├─ MEMORY    → pipeline 2 only
   │   ├─ BOTH      → both in parallel
   │   └─ on failure/timeout → RAG_ROUTER_FALLBACK = BOTH
   ▼
[4] Pipeline 1 (Knowledge)              [4'] Pipeline 2 (Memory)
   ├─ BM25 search (top 20)              ├─ Qdrant vector search w/ user_id filter (top 20)
   ├─ Qdrant vector search (top 20)     ├─ apply time_decay_weight() to each score
   ├─ RRF merge                          ├─ sort by decayed score
   ├─ MMR re-rank → top 5               └─ MMR re-rank → top 3
   ▼                                     ▼
[5] Build prompt: profile + quiz + knowledge_block + history_block
   ▼
[6] LLM (existing _dispatch)
   ▼
[7] Stream reply to user
   ▼
[8] Async fire-and-forget: persist (user_msg, assistant_msg) to user_chat_memory
   │   (reuse query_vec for user_msg; embed assistant_msg fresh)
   └─ trim collection if > RAG_MEMORY_MAX_PER_USER for this user
```

Steps 3, 4, 4' all run inside one `asyncio.gather` — total added latency vs the current code should be ~50ms for the router + ~80ms for two Qdrant round-trips (well under the LLM call time).

---

## 6. New file layout

```
backend/
├── src/
│   ├── services/
│   │   ├── qdrant_client.py        # AsyncQdrantClient singleton + collection/index init
│   │   ├── bm25_index.py           # in-memory BM25Okapi, rebuilt on ingest
│   │   ├── retrieval.py            # public retrieve_knowledge() / retrieve_memory()
│   │   ├── query_router.py         # regex pre-filter + LLM classifier
│   │   └── memory_writer.py        # persist + prune user_chat_memory
│   └── utils/
│       └── embed_utils.py          # KEEP — already correct
└── scripts/
    ├── ingest_finance_docs.py      # chunk + embed + upsert into Qdrant + Mongo (idempotent)
    └── migrate_remove_old_rag.py   # one-shot: drop embedding fields, copy chunks to Qdrant
```

`src/utils/rag_utils.py` → deleted after migration script confirms parity.

---

## 7. Implementation Steps — In Order

### Step 1 — Qdrant client + lifespan init

```python
# src/services/qdrant_client.py
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType
from src.config.settings import get_settings

_client: AsyncQdrantClient | None = None

def get_qdrant() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(url=get_settings().QDRANT_URL)
    return _client

async def init_qdrant() -> None:
    s = get_settings()
    c = get_qdrant()
    existing = {col.name for col in (await c.get_collections()).collections}
    for name in (s.QDRANT_KNOWLEDGE_COLLECTION, s.QDRANT_MEMORY_COLLECTION):
        if name not in existing:
            await c.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=s.QDRANT_VECTOR_SIZE, distance=Distance.COSINE),
            )
    # Payload indexes — idempotent.
    await c.create_payload_index(s.QDRANT_MEMORY_COLLECTION, "user_id", PayloadSchemaType.KEYWORD)
    await c.create_payload_index(s.QDRANT_MEMORY_COLLECTION, "created_at", PayloadSchemaType.DATETIME)
    await c.create_payload_index(s.QDRANT_KNOWLEDGE_COLLECTION, "user_type", PayloadSchemaType.KEYWORD)
    await c.create_payload_index(s.QDRANT_KNOWLEDGE_COLLECTION, "category", PayloadSchemaType.KEYWORD)
```

Wire into `main.py`'s lifespan **after** `init_db()`:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_qdrant()
    await bm25_index.build()    # see Step 5
    yield
```

> **Resilience:** wrap `init_qdrant()` in try/except. Log loudly but don't crash the API — without Qdrant the chat endpoint falls back to "profile-only" mode (no RAG context). Health endpoint should expose Qdrant status.

### Step 2 — Embedding service (reuse what exists)

Keep `src/utils/embed_utils.py::embed_text` as-is. Add **one** helper for batch ingestion:

```python
async def embed_batch(texts: list[str], concurrency: int = 4) -> list[list[float]]:
    """Bounded-concurrency embedding for ingestion scripts."""
    sem = asyncio.Semaphore(concurrency)
    async def _one(t): 
        async with sem: return await embed_text(t)
    return await asyncio.gather(*(_one(t) for t in texts))
```

**Privacy rule:** always use the local `nomic-embed-text` model for embeddings — even when the user picks a cloud LLM provider. Sending vectors to a provider would leak whatever is being indexed (chats, profile). Only the *prompt* and *retrieved chunks* travel to the provider when the user opts in.

### Step 3 — Ingest knowledge base

```python
# scripts/ingest_finance_docs.py
from langchain_text_splitters import RecursiveCharacterTextSplitter
from hashlib import sha256
from qdrant_client.models import PointStruct

splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.RAG_CHUNK_SIZE,
    chunk_overlap=settings.RAG_CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " "],
)

def chunk_id_for(source: str, text: str) -> str:
    # Stable across re-runs → idempotent upsert, no re-embedding unchanged chunks.
    return sha256(f"{source}::{text}".encode()).hexdigest()
```

Per source doc:
1. Split into chunks.
2. For each chunk, compute `chunk_id`. If already in Qdrant (`scroll` w/ filter), skip.
3. Embed new chunks via `embed_batch`.
4. Upsert into `finance_knowledge` with full payload (including `tokens = text.lower().split()` — pre-tokenized for BM25).
5. Mirror text-only into Mongo `KnowledgeChunk` (still useful for admin views, BM25 rebuild on cold start).

Run on demand: `docker compose exec backend python scripts/ingest_finance_docs.py path/to/docs/`.

### Step 4 — BM25 index

```python
# src/services/bm25_index.py
from rank_bm25 import BM25Okapi
import asyncio, re

_index: BM25Okapi | None = None
_chunk_ids: list[str] = []
_lock = asyncio.Lock()

# Finance-aware tokenizer: keep alphanumerics + currency. Avoid breaking "₹1.5L", "80C", "Roth-IRA".
_TOKEN_RE = re.compile(r"[a-z0-9₹]+", re.IGNORECASE)
def tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())

async def build() -> None:
    """Load all knowledge chunks from Mongo and rebuild the index."""
    global _index, _chunk_ids
    async with _lock:
        chunks = await KnowledgeChunk.find_all().to_list()
        _chunk_ids = [c.vector_id for c in chunks]
        _index = BM25Okapi([tokenize(c.content) for c in chunks])

def search(query: str, top_k: int) -> list[tuple[str, float]]:
    if _index is None or not _chunk_ids:
        return []
    scores = _index.get_scores(tokenize(query))
    ranked = sorted(zip(_chunk_ids, scores), key=lambda x: x[1], reverse=True)
    return [(cid, s) for cid, s in ranked[:top_k] if s > 0]
```

Call `await bm25_index.build()` at startup and at the end of every ingestion run.

### Step 5 — RRF + MMR (knowledge pipeline)

```python
def rrf_merge(rankings: list[list[str]], k: int = 60) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

After RRF returns top-N candidate IDs, fetch their vectors from Qdrant and run MMR (keep the existing `_mmr_select` from `rag_utils.py` — port it, then delete the old file).

### Step 6 — Time-decay (memory pipeline)

```python
from datetime import datetime, timezone
from math import pow

def time_decay(created_at_iso: str, half_life_days: int) -> float:
    age_days = (datetime.now(timezone.utc) - datetime.fromisoformat(created_at_iso)).days
    return pow(0.5, age_days / half_life_days)

# Final score = cosine_similarity * time_decay
```

### Step 7 — Query router

Two-stage to avoid an LLM call on every turn:

```python
import re

# Stage A: cheap regex shortcuts — handles ~40% of traffic for free.
PERSONAL = re.compile(r"\b(my|i|me|earlier|before|last (time|month|year)|remember)\b", re.I)
GENERIC = re.compile(r"\b(what is|explain|define|how does .* work|tax rate|limit)\b", re.I)

async def route(query: str, llm_settings: dict) -> str:
    if PERSONAL.search(query) and GENERIC.search(query):
        return "BOTH"
    if PERSONAL.search(query):
        return "MEMORY"
    if GENERIC.search(query):
        return "KNOWLEDGE"
    # Stage B: ask the LLM — 1-token output, 4s timeout, fallback = BOTH.
    try:
        out = await asyncio.wait_for(_router_llm(query, llm_settings), timeout=4.0)
        return out if out in {"KNOWLEDGE", "MEMORY", "BOTH"} else "BOTH"
    except Exception:
        return get_settings().RAG_ROUTER_FALLBACK
```

Router prompt is single-line, demands one-word reply, uses `max_tokens=4`, `temperature=0`. Use the user's currently-selected provider so there's no extra cost dimension.

### Step 8 — Memory writer with prune

```python
async def persist_turn(user_id: str, role: str, text: str, vector: list[float] | None = None):
    if not vector:
        vector = await embed_text(text)
    now = datetime.utcnow().isoformat()
    await get_qdrant().upsert(
        collection_name=settings.QDRANT_MEMORY_COLLECTION,
        points=[PointStruct(id=str(uuid4()), vector=vector,
                            payload={"user_id": user_id, "role": role, "text": text,
                                     "created_at": now, "last_seen_at": now})],
    )
    await _prune_if_needed(user_id)
```

`_prune_if_needed` counts points for `user_id`; if over `RAG_MEMORY_MAX_PER_USER`, deletes the oldest 5% by `created_at`. Run inside a `asyncio.create_task` so it never blocks the chat reply.

### Step 9 — Wire into `chat_service.chat_with_ai`

Replace the current `get_ai_chat_response` body so it calls `retrieval.retrieve_knowledge()` + `retrieval.retrieve_memory()` based on the router output. The prompt builders (`_build_chat_system`, `_build_advice_prompt`) stay — they just receive richer context strings.

### Step 10 — Cutover migration

```python
# scripts/migrate_remove_old_rag.py
# 1. For every KnowledgeChunk with non-empty embedding, push it to Qdrant.
# 2. For every ChatMessage with non-empty embedding, push it to user_chat_memory.
# 3. Verify counts: Mongo chunks == Qdrant points (per collection).
# 4. Drop the `embedding` field via $unset on both collections.
# 5. Run bm25_index.build().
```

After it succeeds: delete `src/utils/rag_utils.py`, remove `embedding` field from both Beanie models, deploy.

---

## 8. Evaluation harness (don't skip this)

Create `scripts/eval_retrieval.py` with a **golden set** of ~30 (query, expected_chunk_ids) pairs. Compute:

- **Recall@5** for knowledge pipeline
- **MRR** (mean reciprocal rank) for memory pipeline
- **Latency p50/p95** per pipeline

Run before merging each retrieval change. Without this, "hybrid is better" is faith, not measurement. Target: Recall@5 ≥ 0.85 on knowledge; latency p95 < 200ms per pipeline (excluding LLM).

---

## 9. Failure modes & fallbacks

| What fails | Behavior |
|---|---|
| Qdrant unreachable | Log error, return `[]` from retrieval. Chat still works with profile-only context. Health endpoint shows degraded. |
| `nomic-embed-text` missing in Ollama | Ingestion script aborts loudly. Live chat: returns `[]` from retrieval, replies without RAG context. |
| Router LLM times out | Fall back to `RAG_ROUTER_FALLBACK` = `BOTH`. |
| Embedding model dim ≠ `QDRANT_VECTOR_SIZE` | `init_qdrant` raises on startup. Don't silently coerce. |
| BM25 index empty (cold start before ingest) | Pipeline degrades to vector-only — no error. |

---

## 10. Privacy (non-negotiable)

| User mode | Embeddings | LLM |
|---|---|---|
| Local (default) | `nomic-embed-text` via Ollama | Gemma via Ollama |
| Cloud opted-in | `nomic-embed-text` via Ollama (forced) | Provider of choice |

Embeddings **always** stay local. The only data that ever leaves the box (when the user opts in to a cloud LLM) is: the rendered prompt — which includes retrieved chunks. That set is visible to the user at request time and is bounded by per-chunk char caps + top-k limits.

---

## 11. Settings cleanup checklist

- [ ] Add Qdrant + new RAG settings (§3)
- [ ] Remove deprecated: `RAG_MIN_SIMILARITY`, `RAG_HISTORY_SCAN_LIMIT`, `RAG_TOP_K`, `RAG_MAX_CHUNK_CHARS`
- [ ] Add `qdrant_url` to `docker-compose.yml` `environment:` block (lowercase, to match the existing pydantic-settings case override pattern)

---

## 12. Milestones

| # | Milestone | Depends on |
|---|---|---|
| 1 | Qdrant in compose, `init_qdrant` runs on startup, payload indexes created | — |
| 2 | `embed_batch` working, dimension verified == 768 | 1 |
| 3 | Ingestion script idempotent on the existing 25 seed chunks | 2 |
| 4 | BM25 index builds at startup + after ingest | 3 |
| 5 | `retrieve_knowledge()` returns ranked chunks (RRF + MMR) | 3, 4 |
| 6 | `retrieve_memory()` returns time-decayed top-k for a user | 1, 2 |
| 7 | Memory writer persists turns + prunes over cap | 6 |
| 8 | Query router (regex + LLM fallback) classifies golden set ≥ 90% correct | 5, 6 |
| 9 | Chat endpoint wired end-to-end; old `rag_utils.py` deleted | 7, 8 |
| 10 | Eval harness green (Recall@5 ≥ 0.85, p95 < 200ms) | 9 |
| 11 | Migration script run in prod; `embedding` fields dropped | 9 |

---

## 13. What we still skip (explicitly)

| Feature | Why skip |
|---|---|
| Cross-encoder re-ranking | MMR + RRF gets us close; add only if eval shows ceiling |
| HyDE | Premature — fix retrieval recall first |
| Graph RAG | Wrong shape for finance Q&A |
| Self-RAG / CRAG / agentic loops | Complexity without proportional payoff at our scale |
| `tiktoken` for chunk sizing | Char-based splitting is fine for non-OpenAI-first stack |

Add any of these only when the eval harness shows a real ceiling, not before.
