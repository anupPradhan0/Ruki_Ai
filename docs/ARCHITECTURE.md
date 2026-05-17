# Architecture

How the RukiAI codebase is organized, how a request flows from the React
frontend to MongoDB and back, and the design decisions behind each layer.

---

## High-level architecture

```
┌─────────────────┐     HTTP/JSON     ┌─────────────────────────────┐    ┌─────────────┐
│  React Frontend │ ───────────────▶  │   FastAPI Backend           │ ──▶│  MongoDB 7  │
│  (Vite + TSR    │ ◀───────────────  │   (Python 3.11, port 8000)  │ ◀──│   (text +   │
│   port 5173)    │      Cookie JWT   │                             │    │   metadata) │
└─────────────────┘                   └──┬───────┬───────┬──────────┘    └─────────────┘
                                         │       │       │
                                         │       │       └──▶ ┌────────────────────┐
                                         │       │            │ Qdrant 1.12        │
                                         │       │            │ (vectors only —    │
                                         │       │            │  KB + per-user mem)│
                                         │       │            └────────────────────┘
                                  HTTP   │       │ HTTPS  (only when user opts in)
                                  local  ▼       ▼
                                ┌────────────────┐  ┌─────────────────────────────┐
                                │  Ollama (local)│  │  User-selected cloud:       │
                                │  Gemma 4 E2B   │  │  Gemini · OpenAI · Claude · │
                                │  nomic-embed   │  │  Cohere — per-user API key  │
                                └────────────────┘  └─────────────────────────────┘
                                      (default — embeddings ALWAYS local)
```

---

## Backend layers (top to bottom)

The Python backend follows a clean layered architecture. Every request
crosses these layers in order:

```
ROUTERS         (FastAPI endpoints, src/routers/*.py)
   │ calls
   ▼
SERVICES        (Business logic, src/services/*.py — raise HTTPException)
   │ calls
   ▼
REPOSITORIES    (Pure DB queries, src/repositories/*.py — return None on miss)
   │ uses
   ▼
MODELS          (Beanie Documents = MongoDB schemas, src/models/*.py)
```

### Layer responsibilities

| Layer | Single responsibility | Doesn't do |
|---|---|---|
| **Router** | Parse HTTP, call a service, return the response | No DB access |
| **Service** | Business rules ("AI advice is stale after 7 days", "quiz clears advice cache") | No raw queries — calls a repository |
| **Repository** | One DB op per function (find, create, update) | No business logic, no HTTP |
| **Model** | Beanie Document — fields, indexes, validators, save hooks | No queries |

This makes every piece **testable in isolation** and makes refactoring cheap.

---

## Folder structure walkthrough

```
backend/
├── main.py                           ← FastAPI app entry point
├── requirements.txt
├── Dockerfile
├── .env                              ← gitignored
└── src/
    ├── config/
    │   └── settings.py               ← Pydantic BaseSettings — reads .env
    │
    ├── db/
    │   └── database.py               ← init_db() — connects to MongoDB,
    │                                    registers all 8 Beanie documents
    │
    ├── models/                       ← MongoDB schemas (Beanie Documents)
    │   ├── enums.py                    ← Currency, UserType, EmploymentType, …
    │   ├── sub_documents.py            ← FinancialGoal, IncomeSource, QuizAnswer, …
    │   ├── user_model.py               ← + ai_provider, ai_model, ai_api_key
    │   ├── student_model.py
    │   ├── employed_model.py
    │   ├── unemployed_model.py
    │   ├── retired_model.py
    │   ├── guest_model.py              ← Anonymous guest session (TTL 2 days)
    │   ├── guest_user_model.py
    │   ├── feedback_model.py
    │   ├── knowledge_model.py          ← KnowledgeChunk — text-only mirror of a Qdrant point
    │   └── chat_message_model.py       ← ChatMessage — authoritative chat log (vectors in Qdrant)
    │
    ├── schemas/                      ← API request/response shapes
    │   ├── common_schemas.py
    │   ├── auth_schemas.py
    │   ├── student_schemas.py
    │   ├── employed_schemas.py
    │   ├── unemployed_schemas.py
    │   ├── retired_schemas.py
    │   ├── guest_schemas.py
    │   ├── feedback_schemas.py
    │   ├── quiz_schemas.py             ← QuizSubmitRequest
    │   ├── chat_schemas.py             ← ChatRequest, ChatResponse
    │   └── ai_settings_schemas.py      ← Provider list, settings get/update
    │
    ├── repositories/
    │   ├── user_repository.py
    │   ├── student_repository.py
    │   ├── employed_repository.py
    │   ├── unemployed_repository.py
    │   ├── retired_repository.py
    │   ├── guest_repository.py
    │   └── feedback_repository.py
    │
    ├── services/
    │   ├── auth_service.py
    │   ├── student_service.py          ← form + dashboard
    │   ├── employed_service.py
    │   ├── unemployed_service.py
    │   ├── retired_service.py
    │   ├── guest_service.py
    │   ├── feedback_service.py
    │   ├── quiz_service.py             ← save_quiz_responses(type, user_id, answers)
    │   ├── chat_service.py             ← chat_with_ai(type, ChatRequest)
    │   ├── ai_settings_service.py      ← list/get/update per-user AI provider settings
    │   │
    │   ├── qdrant_client.py            ← Async Qdrant singleton + init_qdrant
    │   ├── bm25_index.py               ← In-memory BM25 over knowledge_chunks
    │   ├── retrieval.py                ← retrieve_knowledge (RRF+MMR), retrieve_memory (decay+MMR)
    │   ├── query_router.py             ← regex shortcut → LLM classifier (KNOWLEDGE/MEMORY/BOTH)
    │   └── memory_writer.py            ← Qdrant upsert + per-user LRU prune + bg task tracker
    │
    ├── routers/
    │   ├── index_router.py             ← Public pages, send-email
    │   ├── auth_router.py              ← /user/signup, login, logout, guest
    │   ├── user_type_router.py         ← /userType/{type}
    │   ├── dashboard_router.py         ← /dashboard/{type}
    │   ├── feedback_router.py
    │   ├── quiz_router.py              ← POST /quiz/{user_type}
    │   ├── chat_router.py              ← POST /chat/{user_type}
    │   └── ai_settings_router.py       ← /ai-settings/* — providers + per-user config
    │
    ├── middleware/
    │   └── auth_middleware.py        ← get_current_user dependency (JWT)
    │
    └── utils/
        ├── jwt_utils.py
        ├── password_utils.py
        ├── ai_utils.py                ← multi-provider dispatcher: Local Ollama / OpenAI /
        │                                Anthropic / Gemini / Cohere. Owns prompt templates.
        ├── embed_utils.py             ← Ollama nomic-embed-text + embed_batch + cosine
        └── email_utils.py

scripts/
├── ingest_finance_docs.py             ← chunk + embed + upsert .txt/.md (or built-in seed)
└── migrate_remove_old_rag.py          ← one-shot: hoist legacy in-Mongo embeddings into Qdrant
```

---

## Frontend funnel

```
Sign up ──► /onboarding ──► /quiz ──► /dashboard
                                      ├── /dashboard            (Overview)
                                      ├── /dashboard/chat       (AI Chat)
                                      └── /dashboard/settings   (Info + AI provider)
```

### How the funnel is enforced

- `localStorage` holds `{ user_id, user_type }` after signup/login.
- The dashboard service returns `needs_onboarding` and `quiz_completed` on every dashboard fetch.
- The `LoginPage` and `DashboardLayout` both check those flags and redirect:
  - `needs_onboarding === true` → `/onboarding`
  - `quiz_completed === false` → `/quiz`
  - both done → `/dashboard`

So a user can't skip steps by typing `/dashboard` directly — the layout
fetches the dashboard, sees the flags, and bounces them to the right step.

### Frontend folder structure

```
frontend/src/
├── App.tsx, main.tsx, index.css
├── lib/
│   └── api.ts                       ← typed fetch wrapper, all endpoint calls,
│                                       session.{save, read, clear, setUserType}
│
├── components/
│   ├── Navbar.tsx                   ← marketing nav (login/signup pages only)
│   ├── Sidebar.tsx                  ← dashboard nav (Overview, AI Chat, Logout)
│   ├── Footer.tsx
│   ├── sections/                    ← marketing landing-page sections
│   └── pages/
│       ├── LoginPage.tsx
│       ├── SignupPage.tsx
│       ├── OnboardingPage.tsx       ← all 4 user-type forms in one page
│       ├── QuizPage.tsx             ← 10 MCQs per user type, paginated
│       ├── DashboardLayout.tsx      ← gating + sidebar + Outlet
│       ├── DashboardOverview.tsx    ← cards: AI advice, goals, expenses, quiz
│       └── ChatPage.tsx             ← Claude-style composer + message log
│
└── routes/                          ← TanStack Router file-based routes
    ├── __root.tsx                   ← bare <Outlet />
    ├── _layout.tsx                  ← marketing pages (Navbar + Footer)
    │   ├── index.tsx                ← /
    │   ├── about.tsx
    │   ├── features.tsx
    │   └── how-it-works.tsx
    ├── _auth.tsx                    ← Navbar + main (login, signup, onboarding, quiz)
    │   ├── login.tsx
    │   ├── signup.tsx
    │   ├── onboarding.tsx
    │   └── quiz.tsx
    └── dashboard.tsx                ← top-level (no Navbar) — DashboardLayout
        ├── index.tsx                ← /dashboard
        └── chat.tsx                 ← /dashboard/chat
```

The dashboard sits **outside** the `_auth` group on purpose — it owns its
chrome (Sidebar) and shouldn't inherit the marketing Navbar.

---

## Request lifecycle — three real journeys

### 1. New user signs up and reaches the dashboard

```
[1] POST /user/signup → cookie set, frontend stores {user_id, user_type} in localStorage
[2] Navigate /onboarding → user fills the form for their type
[3] POST /userType/{type} → profile saved, user.user_type updated
[4] Navigate /quiz → user answers 10 MCQs
[5] POST /quiz/{type} → saves quiz_responses, clears cached ai_advice
[6] Navigate /dashboard
[7] DashboardLayout fetches GET /dashboard/{type}
    → service computes quiz_completed=True, needs_onboarding=False
    → ai_advice is null/stale → calls get_ai_advice() with profile + quiz signal
    → returns full dashboard
[8] Overview renders: AI Advice card, profile sections, Self-Assessment card
```

### 2. Returning user logs in

```
[1] POST /user/login → cookie set, session stored
[2] Frontend reads user_type from response, calls GET /dashboard/{type}
[3] Routes based on flags:
    - needs_onboarding=true     → /onboarding
    - quiz_completed=false      → /quiz
    - both done                 → /dashboard (data already in react-query cache)
```

### 3. User asks a follow-up in chat

```
[1] User opens /dashboard/chat (no conversation_id in the URL)
    → DashboardLayout renders Sidebar + the ChatPage outlet
    → Sidebar's <ConversationList> fetches GET /conversations and shows past chats
    → ChatPage seeds the first assistant message with the cached ai_advice
[2] User types "How about my credit card debt?", presses Enter
[3] POST /chat/employed with { user_id, message, conversation_id: null, history: [] }
    → chat_service: no conversation_id → creates a new Conversation
      (title = first 60 chars of the message)
    → persists the user turn to chat_messages with that conversation_id
    → loads the last 20 messages for this conversation from DB (= just the
      user turn) and feeds them as `history` to the LLM
    → AI provider replies; the assistant turn is also persisted
    → conversation.updated_at is bumped (sidebar will re-sort)
    → returns { reply, conversation_id: "6a08..." }
[4] Frontend:
    → seeds the React Query cache for ["conversation", new_id] with the
      messages it already has (no flicker on the upcoming navigation)
    → invalidates ["conversations"] so the sidebar refetches
    → navigates to /dashboard/chat/6a08...
[5] The dynamic route (chat.$conversationId.tsx) mounts a new ChatPage
    with that id. The query data is already in cache, so messages render
    immediately. Future sends from this page pass the conversation_id and
    append to the same chat.
```

**Persistence guarantees**

- The user's message is persisted **before** the LLM is called, so a slow
  or failing AI provider never costs the user their input.
- The backend is the source of truth for context: it always builds `history`
  from `chat_messages.find(conversation_id=…)` ordered by `created_at`,
  capped to the most recent 20 turns. The `history` field on the request is
  accepted but ignored — older client builds that still send it keep working.
- Ownership is enforced on every read/write: every `chat_messages` /
  `conversations` query filters by `user_id` (from the JWT cookie), and
  reading a conversation that isn't yours returns `404`, never the doc.

---

## Authentication — JWT cookie flow

```
   Signup/Login                           Subsequent requests
┌──────────────────┐                  ┌──────────────────────────┐
│ Server hashes    │                  │ Middleware reads cookie  │
│ password (bcrypt)│                  │ Decodes JWT (HS256)      │
│ Issues JWT       │                  │ Loads User from DB       │
│ Sets HTTP-only   │                  │ Injects User via         │
│ cookie (30d)     │                  │ Depends(get_current_user)│
└──────────────────┘                  └──────────────────────────┘
```

**Why HTTP-only cookies, not Bearer tokens?**

- Auto-included by the browser; frontend never touches the token
- XSS-safe (JS can't read it)
- Simpler React code — no token storage logic needed

**Sessions**:
- Regular users: 30-day JWT
- Guests: 24-hour JWT, plus a TTL index that auto-deletes the Guest doc after 2 days

---

## AI advice, chat & RAG

The whole AI surface lives in `utils/ai_utils.py`. Two public entry points
(`get_ai_advice`, `get_ai_chat_response`) plus a `PROVIDERS` registry.
Everything else is plumbing: prompt builders, RAG retrieval, persistence.

### Multi-provider AI

`PROVIDERS` is a registry of supported providers, each with 3 model options:

| Provider | Models | Needs API key | Endpoint |
|---|---|---|---|
| `local` (default) | `gemma4:e2b`, `gemma4:e4b`, `gemma3:1b` | no | Ollama `/api/chat` |
| `gemini` | `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash` | yes | `generativelanguage.googleapis.com/v1beta/models/{m}:generateContent` |
| `openai` | `gpt-4o-mini`, `gpt-4o`, `gpt-5` | yes | `api.openai.com/v1/chat/completions` |
| `anthropic` | `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-7` | yes | `api.anthropic.com/v1/messages` |
| `cohere` | `command-a-03-2025`, `command-r-plus`, `command-r` | yes | `api.cohere.com/v2/chat` |

Each user picks one in `/dashboard/settings`. The choice is stored on their
`User` document (`ai_provider`, `ai_model`, `ai_api_key`). Every AI call reads
those fields via `ai_settings_from_user()` and dispatches accordingly. No SDKs
— each provider is a thin httpx call.

**Privacy invariant**: embeddings are *always* local Ollama, even when the
generation provider is cloud. The user's RAG query never reaches a third
party in isolation — only the final assembled prompt does, and only if they
opted into a cloud provider.

### Two RAG pipelines, one prompt

Vectors live in **Qdrant**, text/metadata lives in **MongoDB**. The chat flow
runs a router → up to two retrieval pipelines in parallel → builds the prompt.

| | Pipeline 1 — Knowledge | Pipeline 2 — User Memory |
|---|---|---|
| Qdrant collection | `finance_knowledge` (shared) | `user_chat_memory` (filtered by `user_id`) |
| Retrieval | **BM25 + vector → RRF merge → MMR re-rank** | **Vector + time-decay → MMR re-rank** |
| Why this shape | Finance is keyword-heavy (`80C`, `PPF`, `₹1.5L`) — pure vectors miss exact terms | Recency matters: a chat from yesterday > one from a year ago |

Routing: regex shortcut first (`my/i/me/earlier` → MEMORY, `what is/explain/section N` → KNOWLEDGE); only ambiguous queries make a 1-token LLM call to classify. Failure mode = run both.

Embedding is computed **once per turn** (768-dim `nomic-embed-text`) and reused for retrieval and persistence. Persistence is fire-and-forget so Qdrant latency never blocks the reply; the source-of-truth Mongo write is synchronous.

For everything else — the RRF & MMR math, BM25 tokenizer, time-decay formula, prune behavior, failure modes, settings reference, evaluation, and how to add a new finance source — see [`docs/RAG.md`](./RAG.md).

### Self-Assessment as a first-class signal

`_extract_essential_fields()` pulls the 10 quiz answers into
`data["self_assessment"]`. Both prompt builders pop that out of the generic
profile dump and render it as its own labeled block — `_format_self_assessment()`
formats Q1…Q10 with their answers. The AI is explicitly instructed to use
those answers to anchor habits, attitudes, and risk preferences.

### One-shot advice (`get_ai_advice`)

Used by `GET /dashboard/{type}`.

```
[1] _extract_essential_fields(profile, user_type)
    → income, goals, type-specific fields, self_assessment (10 quiz Q&A)
[2] embed_text(rag_query)  ONCE, reused for both legs
[3] gather(retrieve_knowledge(...), retrieve_memory(...))  → parallel
[4] _build_advice_prompt() composes:
    PROFILE block + SELF-ASSESSMENT block + KNOWLEDGE block
    + PAST CONVERSATIONS block + REQUIREMENTS + FORMAT
[5] _dispatch(ai_settings, messages) → routes to the user's chosen provider
[6] Returns generated text. Failure → friendly fallback string.
```

### Conversational chat (`get_ai_chat_response`)

Used by `POST /chat/{type}`. Returns `(reply, query_vec)` — side-effect-free
so the caller can persist both turns with full control over IDs and ordering.
The surrounding `chat_service` handles Mongo writes, schedules the Qdrant
upsert via `memory_writer.schedule()`, and bumps `conversation.updated_at`.

```
[1] Extract essentials from profile (same as above)
[2] embed_text(message)  ONCE — reused for retrieval AND returned to caller
    (skipped entirely if message < RAG_MIN_QUERY_CHARS)
[3] route_query(message) → KNOWLEDGE / MEMORY / BOTH
[4] gather(retrieve_knowledge / retrieve_memory) for the chosen route(s)
[5] _build_chat_system() composes the system prompt:
    persona + profile + self-assessment + past convos + knowledge + style rules
[6] Append DB-loaded history (last 20 turns of this conversation) + new user message
[7] _dispatch(ai_settings, messages) → user's chosen provider
[8] Return (reply, query_vec) — persistence is the caller's responsibility
```

### Conversation persistence

`chat_service.chat_with_ai()` is the orchestrator that gives the app
ChatGPT-style sidebar history. It owns the **`conversations`** collection
(metadata: `user_id`, `title`, `user_type`, `created_at`, `updated_at`)
and tags every **`chat_messages`** doc with the matching `conversation_id`.

Per request:

1. Resolve the conversation:
   - if `conversation_id` is sent → fetch + ownership check (`404` on mismatch)
   - else → `conversation_service.start_conversation()` creates a new doc with
     a title derived from the first 60 chars of the message
2. Persist the **user turn** to `chat_messages` (with `conversation_id`)
   *before* calling the LLM — guarantees the user's input is never lost if
   the provider 500s.
3. Read the last 20 messages of this conversation from MongoDB. **This is
   the source of truth** — the `history` field on the request is ignored.
4. Call `get_ai_chat_response()` with those messages as context.
5. Persist the **assistant turn** and bump `conversation.updated_at`
   (so the sidebar re-sorts to put this chat on top).
6. Return `{ reply, conversation_id }`.

**Why ignore client-supplied history?** Three reasons:
- It would let a hostile client forge a "you previously agreed to X" prefix.
- It would diverge when the same conversation is open in two tabs.
- The DB already has the full record — there's no reason to trust the wire.

Cascade rules:
- `DELETE /conversations/{id}` removes the conversation **and** all
  `chat_messages` with that `conversation_id`. Older RAG-only messages
  (created before this feature, `conversation_id = None`) are untouched.
- Renames update `conversation.title` and bump `updated_at`.

### Caching strategy

- `ai_advice` and `ai_advice_generated_at` live on each profile document.
- The dashboard service treats advice as **stale** if older than 7 days OR null.
- Stale → regenerate (with full RAG context), save back, return.
- Submitting the quiz **clears** `ai_advice` so the next dashboard fetch
  regenerates with the fresh self-assessment signal.
- Chat does **not** cache responses — but it *does* persist every turn into
  `chat_messages` so user-data RAG keeps growing over time.

---

## MongoDB design choices

### One collection per user type

| Collection | What's in it |
|---|---|
| `users` | Auth-relevant: email, hashed_password, user_type, currency, **ai_provider, ai_model, ai_api_key** |
| `student_data` | Student-specific fields + `quiz_responses[]` |
| `employed_data` | Employed-specific + `quiz_responses[]` |
| `unemployed_data` | Unemployed-specific + `quiz_responses[]` |
| `retired_data` | Retired-specific + `quiz_responses[]` |
| `guests` | Anonymous sessions (TTL: 2 days) |
| `guest_users` | Guest-submitted data (TTL: 7 days) |
| `feedbacks` | Public feedback messages |
| `knowledge_chunks` | Text-only mirror of `finance_knowledge` Qdrant points. `vector_id` links to the Qdrant ID, `chunk_hash` keeps re-ingestion idempotent. |
| `chat_messages` | Authoritative chat log (source of truth) — text + metadata; optional `vector_id` back-link to the matching `user_chat_memory` Qdrant point. |
| `conversations` | Sidebar-grouping doc per chat thread: `user_id`, `title`, `user_type`, timestamps |

This keeps each schema focused, lets us add fields per type without bloating
the user model, and makes profile-specific queries fast.

### Indexes

| Collection | Indexes |
|---|---|
| `users` | `email` (unique), `user_type`, `created_at` |
| `student_data` | `user_id` (unique), `education_level`, `living_situation`, `created_at` |
| `employed_data` | `user_id` (unique), `work_industry`, `employment_type`, `created_at` |
| `unemployed_data` | `user_id` (unique), `employment_status`, `created_at` |
| `retired_data` | `user_id` (unique), `created_at` |
| `guests` | TTL on `created_at` — auto-delete after 2 days |
| `guest_users` | `user_id` (unique), `current_status`, TTL `created_at` (7 days) |
| `feedbacks` | `created_at` (desc), `is_public` |
| `chat_messages` | `user_id`, `created_at`, compound **`(user_id, created_at desc)`** for per-user memory scans, compound **`(conversation_id, created_at)`** for per-conversation history reads |
| `knowledge_chunks` | `user_type`, `created_at`, sparse-unique `vector_id`, sparse-unique `chunk_hash` |
| `conversations` | Compound `(user_id, updated_at desc)` — what the sidebar query reads in one index hit |

### Pydantic + Beanie validators

Every Beanie document has `validate_on_save = True`, and all sub-documents
use `extra="forbid"`. Even a buggy service that tries to write bad data gets
stopped at the DB boundary. Combined with save-event hooks:

```python
@before_event(Replace, SaveChanges, Update)
async def _touch_updated_at(self):
    self.updated_at = datetime.utcnow()
```

`updated_at` is auto-managed by the model itself — no service has to remember.

---

## Error handling philosophy

```
Repository  →  Returns None on not-found, never raises
Service     →  Raises HTTPException(status_code, detail)
Router      →  Lets exceptions bubble up — FastAPI catches them
Middleware  →  Raises HTTPException(401) for any auth failure
```

- Repositories are predictable (always return a value or None).
- Services own all "what's the right HTTP response" decisions.
- Routers stay short.

Frontend can rely on consistent error shapes: every error response is
`{"detail": "..."}` with the right HTTP status.

---

## What lives where — cheat sheet

| Need to... | Edit... |
|---|---|
| Add a new field to a user profile | `models/<type>_model.py` + `schemas/<type>_schemas.py` (FormRequest **and** ProfileSummary) |
| Change validation rules on input | `schemas/<type>_schemas.py` |
| Add a new endpoint | `routers/<area>_router.py` + matching service |
| Fix a database query bug | `repositories/<type>_repository.py` |
| Change AI advice prompt | `utils/ai_utils.py → _build_advice_prompt()` |
| Change AI chat system prompt / persona | `utils/ai_utils.py → _build_chat_system()` |
| Add a new AI provider | `utils/ai_utils.py` → add to `PROVIDERS` + write `_<provider>_chat()` + add a branch in `_dispatch()` |
| Add available models for an existing provider | `utils/ai_utils.py → PROVIDERS[<id>]["models"]` |
| Tune RAG retrieval | `config/settings.py → RAG_KNOWLEDGE_TOP_K, RAG_MEMORY_TOP_K, RAG_CANDIDATE_POOL, RAG_RRF_K, RAG_MMR_LAMBDA, RAG_MEMORY_HALF_LIFE_DAYS, RAG_MEMORY_MAX_PER_USER, RAG_ROUTER_TIMEOUT_SECONDS, RAG_ROUTER_FALLBACK, RAG_MIN_QUERY_CHARS, RAG_MAX_CHUNK_CHARS` (all overridable via `.env`) — see [`docs/RAG.md`](./RAG.md#settings-reference) for the full table |
| Add finance knowledge | (a) Add entries to `scripts/ingest_finance_docs.py → SEED` and re-run, OR (b) pass real `.txt` / `.md` paths: `python scripts/ingest_finance_docs.py docs/finance/` |
| Swap embedding model | `config/settings.py → OLLAMA_EMBED_MODEL` **AND** `QDRANT_VECTOR_SIZE` (must match new model's dim). Drop + recreate Qdrant collections (`docker compose down -v qdrant && docker compose up -d qdrant`), then re-ingest. |
| Lock down CORS / cookies for prod | `config/settings.py → APP_ENV=production` and `ALLOWED_ORIGINS=` (comma-separated) drive both. Cookies auto-flip to `secure=True, samesite=lax` when `app_env=production`. |
| Add quiz questions for a user type | `frontend/src/components/pages/QuizPage.tsx → QUESTIONS` |
| Add a new dashboard section | `frontend/src/components/pages/DashboardOverview.tsx` |
| Add a sidebar nav item | `frontend/src/components/Sidebar.tsx → NAV` |
| Adjust JWT expiry | `utils/jwt_utils.py` + `routers/auth_router.py` cookie max_age |
| Add a new env var | `config/settings.py` + `.env` + `.env.example` |
| Change MongoDB connection | `db/database.py` |

---

See [`API.md`](./API.md) for the full endpoint reference,
[`RAG.md`](./RAG.md) for the deep dive into the retrieval system, and
[`TECH_STACK.md`](./TECH_STACK.md) for library justifications.
