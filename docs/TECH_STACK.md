# Tech Stack

Every library used in this project, what it does, and why it was picked over alternatives.

---

## Backend

### **FastAPI** — web framework
- Async-first Python framework
- Auto-generates OpenAPI/Swagger docs from type hints
- Built on top of Pydantic for validation
- **Why over Flask**: async, automatic docs, type safety, much faster
- **Why over Django**: lighter, async, no built-in admin/ORM bloat

### **Beanie** — MongoDB ODM
- Async ODM built on top of Motor (async MongoDB driver)
- Pydantic-native: every Document is a Pydantic model
- Provides `before_event` hooks for `Insert`, `Replace`, `SaveChanges`, `Update`
- **Why over Mongoengine**: Mongoengine is sync; Beanie is async-first
- **Why over plain Motor**: Motor is just the driver; Beanie adds schema, validation, hooks

### **Pydantic v2** — data validation & settings
- Validates every request, response, and DB write
- Used as: request schemas, response schemas, sub-document schemas, Beanie Documents, BaseSettings
- **Why**: Pydantic is the foundation of FastAPI and Beanie — not optional in this stack

### **python-jose** — JWT signing
- Pure-Python implementation of JWT (RFC 7519)
- Used for auth tokens (HS256 algorithm)
- **Why over PyJWT**: more feature-complete, supports JWE/JWS

### **passlib + bcrypt** — password hashing
- bcrypt is the industry-standard password hash
- passlib provides a clean API on top
- **Why pinned to bcrypt 4.0.1**: passlib breaks with bcrypt ≥ 4.1 due to a removed internal attribute

### **httpx** — async HTTP client
- Used for every AI provider call (Ollama, OpenAI, Anthropic, Gemini, Cohere) and the Ollama embeddings call
- Async, drop-in `requests`-style API, supports HTTP/2
- **Why over `requests`**: blocking; would stall the FastAPI event loop
- **Why over each provider's SDK**: fewer pinned deps, simpler upgrade story, all providers go through the same dispatcher in `ai_utils.py`

### **Ollama (external service, not a Python lib)** — local AI runtime
- Runs Gemma 4 E2B for chat/advice and `nomic-embed-text` for embeddings
- HTTP API at `localhost:11434` — no SDK lock-in
- **Why over hugging-face transformers in-process**: single binary, GGUF model loading, optimised CPU inference, simpler ops
- **Why local at all**: privacy. The default provider keeps every byte of profile/quiz/chat data on the user's own server. Cloud providers are opt-in per user.

### **Gemma 4 E2B** — default chat model
- Effective 2B params at inference (~7 GB on disk; runs in ~3 GB RAM at Q4)
- Released April 2026 by Google DeepMind under Apache-2.0 — fine for commercial fine-tuning
- **Why over Llama 3 / Mistral / Phi**: latest small model with strong reasoning + instruction-following at this size class. RAG closes the gap with much larger models for narrow tasks like financial advice.

### **`nomic-embed-text`** — embedding model
- 768-dim text embeddings via Ollama, ~280 MB
- Great quality-per-byte, runs comfortably on CPU
- **Why this and not a cloud embedding API**: same privacy reason as above. Even if a user picks OpenAI for chat, embeddings never leave the server.

### **aiosmtplib** — async email sending
- Async SMTP client
- **Why over smtplib (built-in)**: smtplib is blocking, would block the FastAPI event loop

### **motor** — MongoDB async driver
- Used internally by Beanie
- Pinned to 3.3.2 for compatibility with Beanie 1.25

### **pymongo** — sync MongoDB driver
- Used for index creation during init
- Pinned to 4.6.3 for compatibility

### **pydantic-settings** — env var loading
- Reads `.env`, validates types, makes settings importable
- **Why over python-dotenv directly**: type-safe, validation at startup, single source of truth

### **uvicorn** — ASGI server
- Async server that runs FastAPI
- Hot reload during development (`--reload`)
- Production: uses `[standard]` extras for httptools and uvloop (faster)

---

## Frontend

### **React 18** — UI framework

### **Vite 6** — build tool
- Lightning-fast HMR
- ES module–based dev server
- **Why over CRA (Create React App)**: CRA is deprecated, Vite is 10–100× faster

### **TypeScript** — type safety

### **TanStack Router** — file-based routing
- Type-safe router with file-based route generation
- Auto-generates `routeTree.gen.ts` based on `src/routes/` folder layout
- Pathless layout groups (`_auth.tsx`) wrap login/signup/onboarding/quiz with the marketing Navbar; the dashboard sits **outside** that group so it owns its own chrome (Sidebar) — and now has three children: `index` (overview), `chat`, and `settings`
- **Why over React Router**: full type safety on route params, search params, navigation

### **TanStack Query** — server state management
- Caches API responses, deduplicates requests, handles loading/error states
- **Why over plain fetch + useState**: dramatically less boilerplate, automatic caching, stale-while-revalidate

### **Tailwind CSS 3** — styling
- Utility-first CSS
- Compile-time → tiny production bundle
- **Why over CSS modules / styled-components**: faster iteration, no naming, no context switching, smaller output

### **lucide-react** — icon set
- Clean, consistent SVG icon library
- Tree-shakeable

### **shadcn/ui peer deps** — accessible primitives
- `@radix-ui/react-slot`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-dropdown-menu`
- `class-variance-authority`, `clsx`, `tailwind-merge`
- These are the building blocks for shadcn-style components

### **pnpm** — package manager
- **Why over npm**: faster installs, no duplication in node_modules (uses symlinks to a content-addressable store)

---

## Database

### **MongoDB 7**
- Document database — fits well with profile-per-user-type design
- Native JSON storage, indexes, TTL support
- **Why over PostgreSQL**: profile shapes vary widely between user types; relational schemas would need many nullable columns or table-per-type joins
- Embedding vectors are stored as `list[float]` on `knowledge_chunks` and `chat_messages`. Cosine similarity is computed in Python (brute-force, fine up to ~10k items). For larger scale, swap to MongoDB Atlas Vector Search.

---

## Infrastructure

### **Docker Compose**
- Defines 3 services: `mongo`, `backend`, `frontend`
- Healthchecks ensure backend waits for Mongo to be ready
- Ollama is run on the host (or could be added as a 4th compose service if you prefer)
- **Why over Kubernetes**: this is a single-machine project; k8s is overkill

### **nginx** (frontend container)
- Serves the production React build
- Falls back all routes to `index.html` (SPA mode)
- Proxies `/api/*` to the backend service

---

## Why these specific patterns

### **Layered architecture (Router → Service → Repository → Model)**
Inspired by clean architecture / DDD — every file has one reason to change.

### **HTTP-only JWT cookies**
- Auto-included by browsers — frontend never touches the token
- XSS-resistant (JS can't read it)
- 30-day expiry for users, 24-hour for guests

### **One collection per user type**
- Each profile has very different fields — single-collection approach with optional fields would be a nightmare
- Profile-specific queries stay fast (indexed by user_id)
- Easy to add new user types without touching the User collection

### **Privacy-first AI by default; cloud is opt-in per user**
- Default `ai_provider = "local"` on every new User
- A user must explicitly pick a cloud provider in `/dashboard/settings` and paste their own API key
- Embeddings are *always* local, even when chat goes to a cloud provider — so RAG queries never leak to a third party

### **Multi-provider via thin httpx wrappers, not SDKs**
- Each provider gets a `_<provider>_chat()` function in `ai_utils.py` that hits its REST endpoint directly with httpx
- One `_dispatch()` selects the right one based on user settings
- No SDK pinning, no version conflicts, swapping providers is a 30-line addition

### **Two RAG pipelines that share infrastructure**
- **Knowledge RAG** retrieves from `knowledge_chunks` (curated finance facts), filtered by `user_type`
- **User-data RAG** retrieves from `chat_messages` (this user's persisted turns), filtered by `user_id`
- Both call the same `embed_text()` and `cosine_similarity()` helpers
- Both inject their results into the same prompt builders (`_build_advice_prompt`, `_build_chat_system`)

### **RAG retrieval is tuned for small models, not raw recall**
- **Single embed per request** — query is embedded once and the vector reused for both knowledge and user-data retrieval (saves an Ollama hop per chat turn)
- **Min-similarity threshold** drops weakly-matching chunks before they reach the LLM. A small model like Gemma 4 E2B is more hurt by irrelevant context than helped — bad context is worse than no context.
- **MMR (Maximal Marginal Relevance)** picks chunks that are both relevant AND distinct from each other. Plain top-k tends to surface 3 near-identical chunks; MMR surfaces complementary ones.
- **History scan cap** (`RAG_HISTORY_SCAN_LIMIT`) bounds CPU/memory as `chat_messages` grows from dozens to thousands.
- **Per-chunk truncation** keeps prompts tight — important because the local 2B model is sensitive to prompt length on CPU.
- **Skip RAG for trivial messages** — "ok", "thanks", short reactions don't trigger retrieval, saving the round-trip.
- All thresholds are env-tunable via `RAG_*` settings, not hardcoded.

### **AI advice 7-day cache (with quiz invalidation)**
- Local Gemma takes 5–30 seconds per call on CPU
- A user's spending pattern doesn't change daily
- Cached advice on dashboard load = sub-100ms response time
- Submitting the quiz wipes the cache so the next dashboard call re-runs generation with the new self-assessment signal mixed in

### **Self-assessment as a first-class prompt block**
- The 10 quiz answers used to be flattened into a generic profile blob
- Now they're rendered as their own labeled section so the LLM weights them properly when generating advice
- This was the cheapest, highest-leverage prompt change

### **Stateless current-conversation, stateful long-term memory**
- The current chat thread lives only in React state (frontend re-sends on every turn)
- But every completed turn is *also* persisted server-side with an embedding
- Future conversations retrieve those persisted turns via user-data RAG — the AI "remembers" without bloating every request

### **TTL indexes for guest data**
- Guest sessions auto-expire after 2 days
- Guest profile data after 7 days
- Zero cleanup code needed — MongoDB handles it

### **Pydantic everywhere**
- API boundary validation (FastAPI)
- DB schema validation (Beanie)
- Cross-field validators (e.g. beneficiary % can't exceed 100%)
- Env var validation (BaseSettings)
- One library, four jobs, fully type-safe

---

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how everything ties together.
