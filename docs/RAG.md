# RAG — Developer Guide

How RukiAI's Retrieval-Augmented Generation system actually works: the two pipelines, the algorithms, the code layout, the failure modes, and how to extend it. If you're touching anything under `src/services/{retrieval,bm25_index,query_router,memory_writer,qdrant_client}.py`, read this first.

---

## TL;DR

- **Two collections in Qdrant**, both 768-dim cosine, both initialised at startup:
  - `finance_knowledge` — shared, immutable until you re-ingest. Curated finance facts.
  - `user_chat_memory` — per-user (filtered by `user_id` payload). Every chat turn is upserted here.
- **Vectors live in Qdrant. Text + metadata live in MongoDB.** Mongo is the source of truth; Qdrant is a write-through index.
- **Two retrieval pipelines** with different strategies:
  - Knowledge → **BM25 + vector → RRF merge → MMR re-rank** (hybrid because finance is keyword-heavy).
  - Memory → **vector + time-decay (30-day half-life) → MMR re-rank** (because recent context > stale).
- **A query router** decides whether to run KNOWLEDGE / MEMORY / BOTH. Regex shortcuts first; a 1-token LLM call as fallback when regex is ambiguous.
- **Embeddings are always local** (`nomic-embed-text` via Ollama). Even when the chat LLM is a cloud provider.
- **Persistence is fire-and-forget**: Mongo writes are synchronous (never lose a turn); Qdrant upserts run in a background task tracked by a strong-ref set.

---

## File map

```
backend/src/services/
├── qdrant_client.py     singleton + idempotent init_qdrant (collections + payload indexes)
├── bm25_index.py        in-memory BM25Okapi over knowledge_chunks; rebuilt on startup + ingest
├── retrieval.py         retrieve_knowledge() / retrieve_memory() + RRF + MMR + time-decay + prompt formatters
├── query_router.py      regex shortcut → LLM classifier; returns "KNOWLEDGE" | "MEMORY" | "BOTH"
└── memory_writer.py     persist_turn() (Qdrant upsert + vector_id back-fill) + LRU prune + schedule()

backend/src/utils/
├── embed_utils.py       embed_text() (single) + embed_batch() (bounded concurrency)
└── ai_utils.py          get_ai_chat_response() — wires it all together, returns (reply, query_vec)

backend/src/models/
├── knowledge_model.py   KnowledgeChunk — text mirror of a Qdrant point. vector_id + chunk_hash unique sparse.
└── chat_message_model.py ChatMessage — authoritative chat log. Optional vector_id back-link to Qdrant.

backend/scripts/
├── ingest_finance_docs.py    chunk + embed + upsert .txt/.md files (or built-in SEED). Idempotent.
└── migrate_remove_old_rag.py one-shot — lifts legacy in-Mongo embeddings into Qdrant.
```

---

## Architecture

```
                                user message
                                     │
                  ┌──────────────────┴───────────────────┐
                  │  Cheap pre-filter: len < RAG_MIN_     │   yes → skip RAG entirely,
                  │  QUERY_CHARS? (default 12)            │──────► LLM gets profile only
                  └──────────────────┬───────────────────┘
                                     │ no
                                     ▼
                  ┌───────────────────────────────────────┐
                  │  embed_text(message) → query_vec      │   ONE Ollama round-trip,
                  │  (cached for retrieval + persistence) │   reused everywhere
                  └──────────────────┬───────────────────┘
                                     ▼
                  ┌───────────────────────────────────────┐
                  │  query_router.route(message, settings)│
                  │  ① regex shortcut                     │   ~40% of traffic exits here
                  │  ② else: 1-token LLM call (4s budget) │
                  │  ③ fallback: RAG_ROUTER_FALLBACK=BOTH │
                  └──────────────────┬───────────────────┘
                                     ▼
            ┌─────────────────────────────────────────────────┐
            │  asyncio.gather(                                │
            │     retrieve_knowledge() if KNOWLEDGE/BOTH,     │
            │     retrieve_memory()    if MEMORY/BOTH         │
            │  )                                              │
            └──────────────────┬─────────────────────────────┘
                               ▼
                       ┌────────────────┐
                       │ format prompt  │   profile + quiz + KB block + memory block
                       └───────┬────────┘
                               ▼
                       ┌────────────────┐
                       │  _dispatch()   │   Local Ollama / Gemini / OpenAI / Anthropic / Cohere
                       └───────┬────────┘
                               ▼
                          reply returned
                               │
                               ▼  (fire-and-forget, ref held)
              ┌─────────────────────────────────────┐
              │  memory_writer.persist_turn() x2    │   user turn (reuses query_vec)
              │  ① write vector_id to Mongo         │   + assistant turn (fresh embed)
              │  ② upsert Qdrant point              │   + LRU prune if user > cap
              └─────────────────────────────────────┘
```

---

## Pipeline 1 — Knowledge retrieval (`retrieve_knowledge`)

**Goal**: surface finance facts grounded in BOTH semantic similarity AND exact-keyword hits (so a query about "Section 80C limit" finds the 80C chunk even if the embedding under-weights the term).

### 1. BM25 leg

`bm25_index.search(query, top_k=RAG_CANDIDATE_POOL)` — pure in-memory `BM25Okapi` over every `KnowledgeChunk`'s `title + content`.

- The tokenizer is finance-aware: `re.compile(r"[a-z0-9₹%]+", re.IGNORECASE)`. This preserves `80C`, `₹1.5L`, `7.1%` as single tokens instead of stripping them.
- The index is built at startup (`lifespan` hook) and rebuilt after every ingestion run. Cheap up to ~100k chunks. (For larger corpora, swap to a persistent BM25 — `whoosh` or `Tantivy` — but that's not needed yet.)
- The index key for each chunk is its `vector_id` (Qdrant UUID), so BM25 and vector rankings can be merged on the same ID space.

### 2. Vector leg

`AsyncQdrantClient.search(collection="finance_knowledge", query_vector=query_vec, limit=RAG_CANDIDATE_POOL, query_filter=...)`.

The filter is the interesting part. When `user_type` is given, we want chunks that match that bucket **OR** chunks tagged as universal (`user_type: null`):

```python
Filter(should=[
    FieldCondition(key="user_type", match=MatchValue(value=user_type)),
    IsEmptyCondition(is_empty=PayloadField(key="user_type")),
])
```

> **Gotcha** — `MatchValue(value=None)` silently matches nothing in Qdrant. You **must** use `IsEmptyCondition` (or `IsNullCondition`) for the null arm, otherwise every universal chunk becomes invisible. We learned this the hard way.

A payload index on `user_type` makes this filter O(log n) instead of a full scan — created in `init_qdrant`.

### 3. RRF merge

```python
def _rrf(rankings: list[list[str]], k: int = 60) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

Reciprocal Rank Fusion — the standard hybrid-retrieval merge. Each leg contributes `1 / (k + rank)`; `k = 60` is the literature default (`RAG_RRF_K`). The constant flattens the curve so the top rank isn't crushingly dominant; tune downward if you want the top leg to weigh more.

### 4. MMR re-rank

Maximal Marginal Relevance — picks `RAG_KNOWLEDGE_TOP_K` results that maximise:

```
MMR(c) = λ · sim(query, c)  −  (1 − λ) · max_{c' picked} sim(c, c')
```

Where `λ = RAG_MMR_LAMBDA` (default 0.7). The first term rewards relevance; the second penalises redundancy. Without it you get "three near-duplicate chunks" failure mode.

> **Subtle but important**: the seed pick (`pool.pop(0)`) chooses the top hybrid hit, **not** the top cosine score. We pass the **RRF score** as the relevance term — if you re-sort by cosine first, BM25-only winners (e.g., a perfect "Section 80C" keyword match with a mediocre embedding) get pushed to the back and MMR's seed misses them.

For BM25-only winners (in `merged` but not in `vector_hits`), we batch-fetch their vectors with one `qdrant.retrieve(...)` call so MMR's redundancy term works.

### 5. Format

`format_knowledge(payloads)` truncates each chunk to `RAG_MAX_CHUNK_CHARS` (default 500) and renders as:

```
[1] PPF — Public Provident Fund
PPF offers ~7.1% tax-free interest, 15-year lock-in, …

[2] ELSS for tax saving + equity exposure
Equity-Linked Savings Scheme (ELSS) mutual funds have a 3-year lock-in …
```

---

## Pipeline 2 — Memory retrieval (`retrieve_memory`)

**Goal**: surface this user's most relevant past turns, with newer turns weighted higher than older ones.

### 1. Filter

```python
Filter(
    must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))],
    must_not=[FieldCondition(key="conversation_id", match=MatchValue(value=current_convo))] or None,
)
```

- `user_id` filter is non-negotiable — never leak one user's memory to another.
- `must_not conversation_id` excludes the current conversation's own turns, so the model isn't fed back "User said earlier: <last message>" awkwardly.
- A payload index on `user_id` (created at startup) keeps this O(log n).

### 2. Vector search + time-decay

For each hit, multiply `cosine_score` by:

```python
weight = pow(0.5, age_days / RAG_MEMORY_HALF_LIFE_DAYS)   # default 30 days
```

A turn from 30 days ago counts for 50%; from 60 days ago, 25%. Tweak `RAG_MEMORY_HALF_LIFE_DAYS` if you want stickier memory.

Also drops anything created in the last `RAG_MEMORY_EXCLUDE_RECENT_SECONDS` (default 60s) — guards against the in-flight turn being retrieved by its own embedding.

### 3. MMR re-rank

Same MMR as the knowledge pipeline. Picks top `RAG_MEMORY_TOP_K` (default 3) past turns.

### 4. Format

```
User: I'm worried about my credit card debt going up

RukiAI: Your statement balance is at 60% utilization — pay it down before …
```

---

## The query router (`query_router.route_query`)

Three stages, cheapest first:

```python
# Stage A — regex shortcuts (free, ~40% of traffic)
PERSONAL = r"\b(my|i|me|earlier|before|previously|last (time|week|month|year)|remember|...)\b"
GENERIC  = r"\b(what (is|are)|explain|define|how does .* work|tax (rate|slab|deduction)|section \d+|...)\b"

if both match → "BOTH"
elif PERSONAL → "MEMORY"
elif GENERIC  → "KNOWLEDGE"

# Stage B — single-token LLM classification (4s timeout)
prompt = "Classify the user query… Reply with exactly ONE word: KNOWLEDGE / MEMORY / BOTH."
out = await asyncio.wait_for(_dispatch(settings, [prompt], temperature=0, max_tokens=4), timeout=4.0)
if out in VALID: return out

# Stage C — fallback
return RAG_ROUTER_FALLBACK   # default "BOTH"
```

Design notes:
- The LLM call uses the user's currently-selected provider — no extra cost dimension to track.
- On a reasoning model (gpt-5, o-series), `max_tokens=4` shared with reasoning means the visible output may be empty. The function falls back to `BOTH`. Cost: extra retrieval; benefit: never wrong.
- The `_dispatch` import is **lazy** inside `_llm_route` to break the import cycle (ai_utils → query_router → ai_utils).

---

## Persistence — the chat-turn write path

The plan was: "ai_utils fires the Qdrant upsert in the background." That introduced two bugs we caught in review:

1. **Duplicate Mongo writes** — chat_service was already calling `chat_message_repository.add_message`. ai_utils doing its own write created a duplicate row per turn.
2. **`vector_id` never populated** — fire-and-forget meant chat_service had no way to back-fill the Qdrant point ID into the ChatMessage row.

Fix: make `get_ai_chat_response` side-effect-free. It returns `(reply, query_vec)`. `chat_service` then:

```python
user_msg = await chat_message_repository.add_message(... role="user" ...)
reply, query_vec = await get_ai_chat_response(...)
assistant_msg = await chat_message_repository.add_message(... role="assistant" ...)
await conversation_repository.touch(convo_id)

# Fire-and-forget Qdrant persistence. memory_writer.schedule() holds a
# strong ref so the task can't be GC'd mid-flight.
schedule(persist_turn(
    user_id, "user", text, user_type,
    embedding=query_vec or None,       # reuse — saves an Ollama round-trip
    conversation_id=convo_id,
    chat_message_id=user_msg.id,       # for vector_id back-fill
))
schedule(persist_turn(
    user_id, "assistant", reply, user_type,
    conversation_id=convo_id,
    chat_message_id=assistant_msg.id,
))
```

`persist_turn` writes `vector_id` to Mongo **before** the Qdrant upsert. If the upsert fails on retry, the next migration sees the existing `vector_id` and skips the row — no orphan Qdrant points. The opposite ordering creates orphans because a Mongo update failure leaves Qdrant ahead.

### The strong-ref task set

```python
# memory_writer.py
_pending_tasks: set = set()

def schedule(coro) -> None:
    task = asyncio.create_task(coro)
    _pending_tasks.add(task)
    task.add_done_callback(_pending_tasks.discard)
```

Python 3.11+ only keeps **weak** references to tasks created via `asyncio.create_task`. Without the set, the GC can collect a task while it's still running — silent data loss. The set holds it; the callback releases it.

### Per-user LRU prune

When a user's `user_chat_memory` count exceeds `RAG_MEMORY_MAX_PER_USER` (default 10,000):

1. Scroll up to `to_drop * 10` of their oldest points (bounded — don't scroll 10k+ on every chat turn).
2. Sort by `created_at` ascending.
3. Delete the oldest 5% of cap.

Prune is best-effort; failures are logged and swallowed so they can't break the chat reply.

---

## Settings reference

All in `src/config/settings.py`. Every one is overridable via `.env` (case-insensitive).

### Qdrant

| Setting | Default | What it does |
|---|---|---|
| `QDRANT_URL` | `http://qdrant:6333` | Endpoint. Compose service name from the backend container; `localhost:6333` if running uvicorn on the host. |
| `QDRANT_KNOWLEDGE_COLLECTION` | `finance_knowledge` | Shared finance KB collection name. |
| `QDRANT_MEMORY_COLLECTION` | `user_chat_memory` | Per-user memory collection (filtered by `user_id` payload). |
| `QDRANT_VECTOR_SIZE` | `768` | **Must match the embedding model's dim.** Swap `OLLAMA_EMBED_MODEL` → also update this → drop + recreate Qdrant collections. |

### Retrieval

| Setting | Default | What it does |
|---|---|---|
| `RAG_MIN_QUERY_CHARS` | `12` | Messages shorter than this skip retrieval entirely (greetings, "ok", etc.). |
| `RAG_KNOWLEDGE_TOP_K` | `5` | Final knowledge chunks returned to the prompt. |
| `RAG_MEMORY_TOP_K` | `3` | Final memory turns returned to the prompt. |
| `RAG_CANDIDATE_POOL` | `20` | Per-leg candidates before RRF / MMR. Larger = more thorough, more Qdrant work. |
| `RAG_RRF_K` | `60` | RRF flattening constant. Lower = top rank weighs more. |
| `RAG_MMR_LAMBDA` | `0.7` | MMR diversity. 1.0 = pure relevance; 0.0 = pure diversity. |
| `RAG_MAX_CHUNK_CHARS` | `500` | Per-chunk truncation in the rendered prompt. |
| `RAG_MEMORY_HALF_LIFE_DAYS` | `30` | Time-decay half-life for memory scores. |
| `RAG_MEMORY_MAX_PER_USER` | `10_000` | Hard cap; LRU prune kicks in beyond this. |
| `RAG_MEMORY_EXCLUDE_RECENT_SECONDS` | `60` | Newer than this = ignored by memory retrieval (skips the in-flight turn). |

### Router

| Setting | Default | What it does |
|---|---|---|
| `RAG_ROUTER_TIMEOUT_SECONDS` | `4.0` | Budget for the LLM classifier call. Exceeded → fall back. |
| `RAG_ROUTER_FALLBACK` | `BOTH` | What route to use when the classifier is uncertain or fails. `KNOWLEDGE` / `MEMORY` / `BOTH`. |

### Ingestion

| Setting | Default | What it does |
|---|---|---|
| `RAG_CHUNK_SIZE` | `512` | Target chunk size for `RecursiveCharacterTextSplitter`. |
| `RAG_CHUNK_OVERLAP` | `64` | ~12% overlap. Smooths chunk boundaries. |
| `RAG_EMBED_CONCURRENCY` | `4` | `embed_batch` parallelism. Bound by Ollama's throughput. |

---

## Failure modes

The system degrades gracefully under every failure we've seen:

| Failure | What happens | What the user sees |
|---|---|---|
| Qdrant unreachable on startup | `init_qdrant` logs and continues; API boots in degraded mode. | Chat works with profile + system prompt only — no retrieved facts or memory. |
| Qdrant unreachable mid-request | `retrieve_*` returns `[]`; persistence task logs and gives up. | Reply still arrives, just without RAG context for that turn. |
| Ollama unreachable (embedding) | `embed_text` returns `[]`; retrieval skipped. | Same — no RAG context. |
| Router LLM times out | Falls back to `RAG_ROUTER_FALLBACK = BOTH`. | Both pipelines run, no error surfaced. |
| Mongo OK but Qdrant upsert fails | Mongo `ChatMessage` still saved (source of truth). `vector_id` set, but Qdrant point missing. | Future memory retrieval just doesn't return that turn. Detected by a future eval/migration; harmless. |
| Embedding dim ≠ `QDRANT_VECTOR_SIZE` | Qdrant upsert rejects with a dim-mismatch error. | Caught in logs; the chat reply still returns. |
| BM25 index empty (cold start before ingest) | Knowledge pipeline degrades to vector-only. | No error; results may be weaker until ingest runs. |

The invariant: **Mongo is the source of truth**. Qdrant is a write-through cache. A Qdrant outage degrades retrieval quality but never loses a chat turn.

---

## Ingestion

### One-time / re-seed

```bash
docker compose exec backend python scripts/ingest_finance_docs.py
```

With no arguments, ingests the built-in `SEED` list (25 India-focused finance facts). Idempotent — re-running skips chunks whose `chunk_hash` is already in Mongo.

### Real docs

```bash
docker compose exec backend python scripts/ingest_finance_docs.py docs/finance/
# or specific files
docker compose exec backend python scripts/ingest_finance_docs.py rules/80C.md rules/PPF.md
```

Walks directories for `.txt` / `.md`. Each file is split with `RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64)`. The chunk hash is `sha256(source::text)`, so editing a file changes the hash and re-embeds only the changed chunks.

After insert, BM25 is rebuilt automatically.

### Embedding model swap

To switch from `nomic-embed-text` (768-dim) to, say, `mxbai-embed-large` (1024-dim):

```bash
# 1. .env
OLLAMA_EMBED_MODEL=mxbai-embed-large
QDRANT_VECTOR_SIZE=1024

# 2. Drop + recreate Qdrant collections (vector dims are immutable per collection)
docker compose down qdrant
docker volume rm rukiai_qdrant_data
docker compose up -d qdrant

# 3. Re-ingest
docker compose exec backend python scripts/ingest_finance_docs.py
```

User memory is harder — those points are irrecoverable once Qdrant is wiped. Either accept the loss, or re-embed every `ChatMessage` from Mongo content (write a small migration analogous to `migrate_remove_old_rag.py`).

---

## Migration from the legacy in-Mongo RAG

If you have a deployment that predates this rewrite (vectors stored in `embedding` fields on `KnowledgeChunk` / `ChatMessage`):

```bash
docker compose exec backend python scripts/migrate_remove_old_rag.py
```

What it does:
1. Scrolls every legacy `KnowledgeChunk` / `ChatMessage` with a non-empty `embedding`.
2. For each row, generates a `vector_id` UUID and writes it to Mongo **first**.
3. Batches 256 points at a time into the matching Qdrant collection.
4. `$unset`s the legacy `embedding` field across the board.
5. Restart the API.

Safe to re-run. Skips rows that already have `vector_id` set, so a half-finished migration picks up where it left off without orphaning Qdrant points.

---

## Evaluating retrieval changes

There's no eval harness checked in yet (TODO — see plan §8). When you add one, target:

| Metric | Target | Rationale |
|---|---|---|
| Recall@5 on knowledge pipeline | ≥ 0.85 | A small golden set of ~30 (query → expected chunk_id) pairs |
| MRR on memory pipeline | ≥ 0.70 | Per-user fixtures with known relevant past turns |
| p95 retrieval latency (per pipeline) | < 200ms | Excluding LLM call. Qdrant + BM25 should be fast. |

Run before merging any change to `retrieval.py`, `bm25_index.py`, or the router. Without numbers, "is hybrid better?" stays unanswerable.

---

## How to extend

### Add a new finance source
1. Append entries to `scripts/ingest_finance_docs.py → SEED` (small, structured), **or** drop `.md` files into a `docs/finance/` directory and run `ingest_finance_docs.py docs/finance/`.
2. The script chunks, dedups by hash, embeds new chunks only, upserts, then rebuilds BM25.

### Tune retrieval for a single deployment
Override any `RAG_*` setting in `backend/.env`. No restart needed at the model level, but settings are read at process start — restart the backend after editing.

### Add a new payload field to Qdrant
1. Edit the `payload={...}` dict in `services/memory_writer.py` (memory) or `scripts/ingest_finance_docs.py` (knowledge).
2. If you want to filter by it, add a `create_payload_index(collection, field, schema)` line in `services/qdrant_client.py::init_qdrant`. Restart.

### Swap MMR for a cross-encoder re-ranker
Replace `_mmr_select` in `retrieval.py` with a call to a cross-encoder model (e.g. `cohere/rerank-3` or a local `BGE-reranker`). Keep the function signature `(candidates, k, lambda_)` → `[(score, payload), ...]` so callers don't change. Add latency to your eval harness — cross-encoders are slow.

### Add a third retrieval pipeline (e.g. transactions)
1. Define a new Qdrant collection in `init_qdrant`.
2. Write a `retrieve_transactions` function in `retrieval.py` parallel to the existing two.
3. Add a route classification (`TRANSACTIONS`) in `query_router._VALID` and update the LLM prompt.
4. Add a branch in `get_ai_chat_response` that runs the third pipeline when the route selects it.

---

## Privacy invariants

1. **Embeddings always local.** `embed_text` always hits Ollama (`nomic-embed-text`), even when the chat LLM provider is OpenAI / Anthropic / etc. Sending vectors to a cloud embedder would leak whatever is being indexed.
2. **User memory is namespaced.** Every read of `user_chat_memory` includes a `user_id` filter. No cross-user query path exists in code.
3. **The only thing that leaves the box** (when the user opts in to a cloud LLM) is the assembled prompt — which contains the retrieved chunks and the user's profile. That set is visible to the user at request time, bounded by `RAG_MAX_CHUNK_CHARS` and the top-k limits.

---

## Glossary

| Term | What it means here |
|---|---|
| **BM25** | A classic keyword-based ranking function. Good at exact-term matching (`Section 80C`). Implemented via `rank_bm25.BM25Okapi`. |
| **RRF** | Reciprocal Rank Fusion. Standard way to merge multiple rankings into one. `score(d) = Σ 1 / (k + rank_i(d))`. |
| **MMR** | Maximal Marginal Relevance. Selection algorithm that balances relevance against redundancy. |
| **Time-decay** | Multiplicative score weight `0.5 ^ (age_days / half_life)`. Recent turns weighted higher. |
| **Payload index** | Qdrant's secondary index on a payload field. Makes filtered search O(log n) instead of full scan. |
| **vector_id** | UUID that identifies a Qdrant point. Stored on the matching Mongo row so we can correlate the two stores. |
| **chunk_hash** | `sha256(source::text)`. Makes ingestion idempotent — same content never re-embedded. |
