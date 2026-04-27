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

### **cohere** — AI advice + chat
- Official Cohere Python SDK (v5+)
- Uses `command-r-plus` for both flows:
  - **Advice** — `client.generate()` builds a one-shot prompt from profile + quiz answers (called by the dashboard endpoint, cached for 7 days)
  - **Chat** — `client.chat()` with `chat_history` and a profile-aware `preamble` (called by `POST /chat/{type}`, no persistence)
- **Why Cohere over OpenAI**: cheaper, has a generous free tier, trained for instruction-following

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
- Pathless layout groups (`_auth.tsx`) wrap login/signup/onboarding/quiz with the marketing Navbar; the dashboard sits **outside** that group so it owns its own chrome (Sidebar)
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

---

## Infrastructure

### **Docker Compose**
- Defines 3 services: `mongo`, `backend`, `frontend`
- Healthchecks ensure backend waits for Mongo to be ready
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

### **AI advice 7-day cache (with quiz invalidation)**
- Cohere takes ~2 seconds per call
- A user's spending pattern doesn't change daily
- Cached advice on dashboard load = sub-100ms response time
- Background refresh when the cache expires
- Submitting the quiz wipes the cache so the next dashboard call re-runs Cohere with the new self-assessment signal mixed in

### **Stateless chat (no DB persistence)**
- The frontend keeps the conversation in component state and re-sends the full `history` on every `/chat/{type}` call
- Profile context is injected as a Cohere `preamble`, so each reply stays grounded in real data
- No DB writes per turn → simpler, cheaper, and the user can refresh to start over

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
