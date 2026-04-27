# Architecture

How the RukiAI codebase is organized, how a request flows from the React
frontend to MongoDB and back, and the design decisions behind each layer.

---

## High-level architecture

```
┌─────────────────┐     HTTP/JSON     ┌─────────────────────────────┐    ┌─────────────┐
│  React Frontend │ ───────────────▶  │   FastAPI Backend           │ ──▶│  MongoDB    │
│  (Vite + TSR    │ ◀───────────────  │   (Python 3.11, port 8000)  │ ◀──│   (port     │
│   port 5173)    │      Cookie JWT   │                             │    │   27017)    │
└─────────────────┘                   └──────────────┬──────────────┘    └─────────────┘
                                                     │
                                                     │ HTTPS
                                                     ▼
                                            ┌──────────────────┐
                                            │   Cohere AI      │
                                            │  command-r-plus  │
                                            │  (generate+chat) │
                                            └──────────────────┘
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
    │   ├── user_model.py
    │   ├── student_model.py
    │   ├── employed_model.py
    │   ├── unemployed_model.py
    │   ├── retired_model.py
    │   ├── guest_model.py              ← Anonymous guest session (TTL 2 days)
    │   ├── guest_user_model.py
    │   └── feedback_model.py
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
    │   └── chat_schemas.py             ← ChatRequest, ChatResponse
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
    │   └── chat_service.py             ← chat_with_ai(type, ChatRequest)
    │
    ├── routers/
    │   ├── index_router.py             ← Public pages, send-email
    │   ├── auth_router.py              ← /user/signup, login, logout, guest
    │   ├── user_type_router.py         ← /userType/{type}
    │   ├── dashboard_router.py         ← /dashboard/{type}
    │   ├── feedback_router.py
    │   ├── quiz_router.py              ← POST /quiz/{user_type}
    │   └── chat_router.py              ← POST /chat/{user_type}
    │
    ├── middleware/
    │   └── auth_middleware.py        ← get_current_user dependency (JWT)
    │
    └── utils/
        ├── jwt_utils.py
        ├── password_utils.py
        ├── cohere_utils.py            ← get_ai_advice + get_ai_chat_response
        └── email_utils.py
```

---

## Frontend funnel

```
Sign up ──► /onboarding ──► /quiz ──► /dashboard
                                      ├── /dashboard         (Overview)
                                      └── /dashboard/chat    (AI Chat)
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
[1] User opens /dashboard/chat
    → ChatPage seeds messages with the existing ai_advice from the cached
      dashboard query (no extra request)
[2] User types a question, presses Enter
[3] POST /chat/{type} with { user_id, message, history }
    → service loads profile, builds preamble with profile + quiz answers
    → calls Cohere chat API with history + new message
    → returns { reply }
[4] Frontend appends user message and assistant reply to the local list
[5] Conversation lives in component state — no DB persistence
```

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

## AI advice & chat

Two distinct AI flows, both backed by Cohere `command-r-plus`.

### One-shot advice (`utils/cohere_utils.get_ai_advice`)

Used by `GET /dashboard/{type}`.

```
[1] Receive a profile document (StudentData / EmployedData / …)
[2] _extract_essential_fields() pulls type-specific fields:
    - student → education_level, monthly_allowance, financial_goals, …
    - employed → job_title, monthly_salary, fixed_expenses, …
    - retired  → pension, retirement_accounts, healthcare, …
    - any      → quiz_responses → self_assessment
[3] _build_prompt() formats those fields into a structured prompt
[4] Async call to Cohere `client.generate()` (max_tokens=300, temp=0.9)
[5] Returns generated text. On failure: friendly fallback string.
```

### Conversational chat (`utils/cohere_utils.get_ai_chat_response`)

Used by `POST /chat/{type}`.

```
[1] Build the same essential-fields dict from the profile
[2] Pack it into a preamble:
    "You are RukiAI, a personal finance advisor for a {user_type} user.
     Their profile data: {…}.
     Give specific, actionable, numbers-backed advice. Keep replies concise …"
[3] Convert frontend history into Cohere chat_history (USER/CHATBOT roles)
[4] Async call to client.chat() with message + chat_history + preamble
    (max_tokens=400, temp=0.7)
[5] Return reply.text. On failure: friendly fallback string.
```

### Caching strategy

- `ai_advice` and `ai_advice_generated_at` live on each profile document.
- The dashboard service treats advice as **stale** if older than 7 days OR null.
- Stale → regenerate, save back, return.
- Submitting the quiz **clears** `ai_advice` so the next dashboard fetch
  regenerates with the fresh quiz signal.
- Chat doesn't write back — the conversation only lives in the frontend's
  React state.

---

## MongoDB design choices

### One collection per user type

| Collection | What's in it |
|---|---|
| `users` | Auth-relevant: email, hashed_password, user_type, currency |
| `student_data` | Student-specific fields + `quiz_responses[]` |
| `employed_data` | Employed-specific + `quiz_responses[]` |
| `unemployed_data` | Unemployed-specific + `quiz_responses[]` |
| `retired_data` | Retired-specific + `quiz_responses[]` |
| `guests` | Anonymous sessions (TTL: 2 days) |
| `guest_users` | Guest-submitted data (TTL: 7 days) |
| `feedbacks` | Public feedback messages |

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
| Change AI advice prompt | `utils/cohere_utils.py → _build_prompt()` |
| Change AI chat persona | `utils/cohere_utils.py → get_ai_chat_response()` (preamble) |
| Add quiz questions for a user type | `frontend/src/components/pages/QuizPage.tsx → QUESTIONS` |
| Add a new dashboard section | `frontend/src/components/pages/DashboardOverview.tsx` |
| Add a sidebar nav item | `frontend/src/components/Sidebar.tsx → NAV` |
| Adjust JWT expiry | `utils/jwt_utils.py` + `routers/auth_router.py` cookie max_age |
| Add a new env var | `config/settings.py` + `.env` + `.env.example` |
| Change MongoDB connection | `db/database.py` |

---

See [`API.md`](./API.md) for the full endpoint reference and
[`TECH_STACK.md`](./TECH_STACK.md) for library justifications.
