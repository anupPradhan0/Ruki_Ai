# Architecture

This document explains how the RukiAI backend is organized, how a request flows from the client to MongoDB and back, and the design decisions behind each layer.

---

## High-level architecture

```
┌─────────────────┐     HTTP/JSON     ┌─────────────────────────────┐    ┌─────────────┐
│  React Frontend │ ───────────────▶  │   FastAPI Backend           │ ──▶│  MongoDB    │
│  (Vite, port    │ ◀───────────────  │   (Python 3.11, port 8000)  │ ◀──│   (port     │
│   5173)         │      Cookie JWT   │                             │    │   27017)    │
└─────────────────┘                   └──────────────┬──────────────┘    └─────────────┘
                                                     │
                                                     │ HTTPS
                                                     ▼
                                            ┌──────────────────┐
                                            │   Cohere AI      │
                                            │  command-r-plus  │
                                            └──────────────────┘
```

---

## Backend layers (top to bottom)

The Python backend follows a **clean layered architecture**. Every request crosses these layers in order:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. ROUTERS                  ← FastAPI endpoints                │
│      src/routers/*.py        ← URL ↔ handler mapping            │
└────────────────┬────────────────────────────────────────────────┘
                 │ calls
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. SERVICES                 ← Business logic                   │
│      src/services/*.py       ← raises HTTPException on error    │
└────────────────┬────────────────────────────────────────────────┘
                 │ calls
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. REPOSITORIES             ← Pure DB queries                  │
│      src/repositories/*.py   ← never raises, returns None       │
└────────────────┬────────────────────────────────────────────────┘
                 │ uses
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. MODELS                   ← Beanie Documents (MongoDB schemas)│
│      src/models/*.py                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Why the layers?

| Layer | Single responsibility | Doesn't do |
|---|---|---|
| **Router** | Parse the HTTP request, call a service, return the response | Doesn't query the DB. Doesn't know about MongoDB. |
| **Service** | Business rules (e.g. "AI advice is stale after 7 days") | Doesn't query MongoDB directly — calls a repository. |
| **Repository** | One DB operation per function (find, create, update) | No business logic. No HTTP knowledge. |
| **Model** | Defines what a document looks like, validates fields | No queries. |

This makes every piece **testable in isolation** and makes refactoring cheap.

---

## Folder structure walkthrough

```
backend/
├── main.py                           ← FastAPI app entry point
├── requirements.txt                  ← Python dependencies
├── Dockerfile                        ← Container build instructions
├── .env                              ← Secrets & config (gitignored)
└── src/
    ├── config/
    │   └── settings.py               ← Pydantic BaseSettings — reads .env
    │
    ├── db/
    │   └── database.py               ← init_db() — connects to MongoDB,
    │                                    registers all 8 Beanie documents
    │
    ├── models/                       ← MongoDB schemas (Beanie Documents)
    │   ├── enums.py                    ← Currency, UserType, EmploymentType, etc.
    │   ├── sub_documents.py            ← FinancialGoal, IncomeSource, etc.
    │   ├── user_model.py               ← Main user (email, password, type)
    │   ├── student_model.py            ← Student profile fields
    │   ├── employed_model.py
    │   ├── unemployed_model.py
    │   ├── retired_model.py
    │   ├── guest_model.py              ← Anonymous guest session (TTL 2 days)
    │   ├── guest_user_model.py         ← Guest profile data
    │   └── feedback_model.py           ← Public feedback messages
    │
    ├── schemas/                      ← API request/response shapes
    │   ├── common_schemas.py           ← MessageResponse, UserSummary
    │   ├── auth_schemas.py             ← SignupRequest, LoginRequest
    │   ├── student_schemas.py
    │   ├── employed_schemas.py
    │   ├── unemployed_schemas.py
    │   ├── retired_schemas.py
    │   ├── guest_schemas.py
    │   └── feedback_schemas.py
    │
    ├── repositories/                 ← One file per domain — pure async DB queries
    │   ├── user_repository.py
    │   ├── student_repository.py
    │   ├── employed_repository.py
    │   ├── unemployed_repository.py
    │   ├── retired_repository.py
    │   ├── guest_repository.py
    │   └── feedback_repository.py
    │
    ├── services/                     ← Business logic per domain
    │   ├── auth_service.py             ← register_user, login_user, create_guest_session
    │   ├── student_service.py          ← form processing + dashboard with AI advice
    │   ├── employed_service.py
    │   ├── unemployed_service.py
    │   ├── retired_service.py
    │   ├── guest_service.py
    │   └── feedback_service.py
    │
    ├── routers/                      ← FastAPI endpoints, one file per area
    │   ├── index_router.py             ← Public pages, send-email
    │   ├── auth_router.py              ← /user/signup, login, logout, guest
    │   ├── user_type_router.py         ← /userType/{type}
    │   ├── dashboard_router.py         ← /dashboard/{type}
    │   └── feedback_router.py          ← Feedback submit + list
    │
    ├── middleware/
    │   └── auth_middleware.py        ← get_current_user dependency (validates JWT)
    │
    └── utils/
        ├── jwt_utils.py               ← create_token, verify_token (python-jose)
        ├── password_utils.py          ← hash_password, verify_password (bcrypt)
        ├── cohere_utils.py            ← AI advice generation (Cohere)
        └── email_utils.py             ← SMTP send via aiosmtplib
```

---

## Request lifecycle — step by step

Let's trace a real request: **a student logs in and views their dashboard**.

### Request 1 — `POST /user/login`

```
[1] Client sends {email, password} as JSON

[2] FastAPI matches the route → routers/auth_router.py: login()

[3] Router validates body against LoginRequest (Pydantic)
    ↳ rejects malformed email with 422

[4] Router calls service: auth_service.login_user(data)

[5] Service calls repository: user_repository.find_user_by_email(email)
    ↳ Beanie issues async MongoDB query

[6] Service uses utils/password_utils.verify_password()
    ↳ if mismatch → raise HTTPException(401)

[7] Service uses utils/jwt_utils.create_token()
    ↳ payload: {sub: user_id, exp: now + 30 days}

[8] Service returns (user, token)

[9] Router sets HTTP-only cookie:
    response.set_cookie("token", token, httponly=True, max_age=30d)

[10] Router returns AuthResponse(message, user_id, user_type) → JSON
```

### Request 2 — `GET /dashboard/student` (authenticated)

```
[1] Client sends GET request — browser auto-attaches the JWT cookie

[2] FastAPI matches the route → routers/dashboard_router.py

[3] Route uses Depends(get_current_user)
    ↳ middleware/auth_middleware.py extracts cookie
    ↳ validates JWT signature & expiry
    ↳ loads User from DB
    ↳ rejects with 401 if any check fails

[4] Router calls service: student_service.get_student_dashboard(user.id)

[5] Service calls 2 repositories:
    - user_repository.find_user_by_id(user_id)
    - student_repository.find_student_by_user_id(user_id)

[6] If no student profile → return {needs_onboarding: True}

[7] If AI advice is stale (>7 days):
    - Call utils/cohere_utils.get_ai_advice()
    - Save advice via student_repository.update_student_ai_advice()

[8] Service builds typed StudentDashboardResponse with:
    - user (UserSummary)
    - student (StudentProfileSummary)
    - ai_advice (str)

[9] FastAPI uses response_model=StudentDashboardResponse to:
    - validate the response
    - filter out internal fields (Beanie's _id, revision_id)
    - serialize to JSON
```

---

## Authentication — JWT cookie flow

```
   Signup/Login                              Subsequent requests
┌──────────────────┐                     ┌──────────────────────────┐
│ Client posts     │                     │ Client makes any request │
│ email + password │                     │ Cookie auto-attached     │
└────────┬─────────┘                     └────────┬─────────────────┘
         │                                        │
         ▼                                        ▼
┌──────────────────┐                     ┌──────────────────────────┐
│ Server hashes    │                     │ Middleware reads cookie  │
│ password         │                     │ Decodes JWT (HS256)      │
│ (bcrypt)         │                     │ Loads User from DB       │
└────────┬─────────┘                     └────────┬─────────────────┘
         │                                        │
         ▼                                        ▼
┌──────────────────┐                     ┌──────────────────────────┐
│ Generate JWT     │                     │ Inject `User` into       │
│ Sign with        │                     │ route handler via        │
│ JWT_SECRET       │                     │ Depends(get_current_user)│
│ Set HTTP-only    │                     └──────────────────────────┘
│ cookie (30 days) │
└──────────────────┘
```

**Why HTTP-only cookies, not Bearer tokens?**

- **Auto-included** by the browser → frontend doesn't need to manually attach Authorization headers
- **XSS-safe** → JavaScript can't read the token (httpOnly flag)
- **Simpler** for the React side — no token storage logic needed

**Sessions**:
- Regular users: 30-day JWT
- Guests: 24-hour JWT, plus a TTL index that auto-deletes the Guest document after 2 days

---

## AI advice generation flow

The `cohere_utils.get_ai_advice()` function:

```
[1] Receive a profile document (StudentData / EmployedData / etc.)

[2] _extract_essential_fields() pulls relevant fields per user type:
    - student → education_level, monthly_allowance, financial_goals, ...
    - employed → job_title, monthly_salary, fixed_expenses, ...
    - retired → pension, retirement_accounts, healthcare, ...

[3] _build_prompt() formats those fields into a structured prompt:
    "Generate personalized financial advice for a {user_type}.

     DATA:
     • income: 50000
     • job: Engineer
     ...

     REQUIREMENTS:
     • 5-7 actionable recommendations
     • Priority ranking (High/Medium/Low)
     ..."

[4] Async call to Cohere `command-r-plus` model
    - max_tokens=300, temperature=0.9

[5] Returns the generated text, stripped

[6] On any error (bad API key, network failure):
    Returns: "Unable to generate financial advice at this time. Please try again later."
```

**Why 7-day staleness?**

A user's spending pattern doesn't change daily. Regenerating advice on every dashboard load would:
- Burn Cohere API quota
- Make page loads slow (Cohere takes ~2s)
- Provide noisy, slightly different advice every reload

Each dashboard service checks `ai_advice_generated_at` — if older than 7 days OR null, it regenerates. Otherwise it returns the cached advice instantly.

---

## MongoDB design choices

### One collection per user type

Instead of dumping everything into a single `users` collection with optional fields, we use:

| Collection | What's in it |
|---|---|
| `users` | Auth-relevant: email, hashed_password, user_type, currency |
| `student_data` | All student-specific fields, linked via `user_id` |
| `employed_data` | All employed-specific fields, linked via `user_id` |
| `unemployed_data` | All unemployed-specific fields |
| `retired_data` | Pension, healthcare, retirement_accounts, etc. |
| `guests` | Anonymous sessions (TTL: 2 days) |
| `guest_users` | Guest-submitted data (TTL: 7 days) |
| `feedbacks` | Public feedback messages |

This keeps each schema focused, lets us add fields per type without bloating the user model, and makes profile-specific queries fast.

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

### Pydantic validators run at every save

Every Beanie document has `validate_on_save = True`, so even a buggy service that tries to write bad data gets stopped at the DB boundary. Combined with `validate_on_save` on save events:

```python
@before_event(Replace, SaveChanges, Update)
async def _touch_updated_at(self):
    self.updated_at = datetime.utcnow()
```

`updated_at` is auto-managed by the model itself — no service needs to remember.

---

## Error handling philosophy

```
Repository  →  Returns None on not-found, never raises
Service     →  Raises HTTPException(status_code, detail)
Router      →  Lets exceptions bubble up — FastAPI catches them
Middleware  →  Raises HTTPException(401) for any auth failure
```

This separation means:
- Repository functions are predictable (always return a value or None)
- Services own all "what's the right HTTP response" decisions
- Routers stay short

Frontend can rely on consistent error shapes: every error response is `{"detail": "..."}` with the appropriate HTTP status code.

---

## What lives where — a cheat sheet

| Need to... | Edit... |
|---|---|
| Add a new field to a user profile | `models/<type>_model.py` + `schemas/<type>_schemas.py` |
| Change validation rules on input | `schemas/<type>_schemas.py` |
| Add a new endpoint | `routers/<area>_router.py` + matching service |
| Fix a database query bug | `repositories/<type>_repository.py` |
| Change AI prompt template | `utils/cohere_utils.py → _build_prompt()` |
| Adjust JWT expiry | `utils/jwt_utils.py` + `routers/auth_router.py` cookie max_age |
| Add a new env var | `config/settings.py` + `.env` + `.env.example` |
| Change MongoDB connection | `db/database.py` |

---

See [`API.md`](./API.md) for the full endpoint reference and [`TECH_STACK.md`](./TECH_STACK.md) for library justifications.
