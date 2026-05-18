# API Reference

Complete reference for the backend endpoints. The interactive version with
try-it-out is at **http://localhost:8000/docs** while the backend is running.

**Base URL**: `http://localhost:8000`

---

## Auth model

- All authenticated routes read a JWT from the `token` HTTP-only cookie
- Cookie is set automatically by `POST /user/signup`, `POST /user/login`, and `GET /user/guest`
- Cookie lifetime: 30 days (regular users), 24 hours (guests)
- All errors return `{ "detail": "<message>" }`

---

## Endpoint summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | — | Health check |
| GET | `/about` | — | About page placeholder |
| GET | `/features` | — | Features page placeholder |
| GET | `/contact` | — | Contact page placeholder |
| GET | `/how-it-works` | — | How-it-works placeholder |
| POST | `/send-email` | — | Forward contact form to admin email |
| POST | `/user/signup` | — | Create new user account (kicks off email verification) |
| POST | `/user/login` | — | Authenticate existing user |
| GET | `/user/logout` | ✅ | Clear auth cookie on this device |
| **POST** | **`/user/logout-all`** | ✅ | **Invalidate every active JWT for this user (bumps `token_version`)** |
| **GET** | **`/user/me`** | ✅ | **Lightweight session probe — email, verification status, user_type** |
| **POST** | **`/user/forgot-password`** | — | **Send a password-reset email (silent on unknown address)** |
| **POST** | **`/user/reset-password`** | — | **Consume a reset token + set a new password** |
| **POST** | **`/user/change-password`** | ✅ | **Verify current password + set a new one (invalidates other sessions)** |
| **GET** | **`/user/verify-email`** | — | **Consume the link from the verification email** |
| **POST** | **`/user/resend-verification`** | ✅ | **Generate a fresh verify link + re-send it** |
| GET | `/user/guest` | — | Create anonymous guest session |
| POST | `/userType/student` | ✅ | Submit student onboarding form |
| POST | `/userType/update-student` | ✅ | Append goals/categories to existing student profile |
| POST | `/userType/employed` | ✅ | Submit employed onboarding form |
| POST | `/userType/unemployed` | ✅ | Submit unemployed onboarding form |
| POST | `/userType/retired` | ✅ | Submit retired onboarding form |
| **POST** | **`/quiz/{user_type}`** | ✅ | **Save 10-question self-assessment for a user type** |
| **POST** | **`/chat/{user_type}`** | ✅ | **Conversational AI follow-up — persists turns, returns `conversation_id`** |
| **POST** | **`/chat/{user_type}/stream`** | ✅ | **Same as above, but streams the reply token-by-token over Server-Sent Events** |
| **GET** | **`/conversations`** | ✅ | **List the user's conversations for the sidebar** |
| **GET** | **`/conversations/{id}`** | ✅ | **Load a conversation + its full message list** |
| **PATCH** | **`/conversations/{id}`** | ✅ | **Rename a conversation** |
| **DELETE** | **`/conversations/{id}`** | ✅ | **Delete a conversation and all its messages** |
| GET | `/dashboard/student` | ✅ | Get student dashboard with AI advice |
| GET | `/dashboard/employed` | ✅ | Get employed dashboard with AI advice |
| GET | `/dashboard/unemployed` | ✅ | Get unemployed dashboard with AI advice |
| GET | `/dashboard/retired` | ✅ | Get retired dashboard with AI advice |
| POST | `/dashboard/guest` | — | Submit guest profile data |
| **GET** | **`/ai-settings/providers`** | ✅ | **List supported AI providers + models** |
| **GET** | **`/ai-settings`** | ✅ | **Get current user's AI provider/model** |
| **POST** | **`/ai-settings`** | ✅ | **Update user's provider, model, and API key** |
| POST | `/submit-feedback` | — | Save public feedback |
| GET | `/api/feedback` | — | List recent feedback |

---

## Auth & sessions

### `POST /user/signup`

Create a new user account, set a JWT cookie.

**Request body**
```json
{
  "full_name": "Jane Doe",        // optional, max 100 chars
  "email": "jane@example.com",    // required, valid email
  "password": "secure123",        // required, min 6 chars
  "phone_number": "+91...",       // optional
  "currency": "INR",              // INR | USD | EUR (default INR)
  "user_type": "student"          // optional: student | employed | unemployed | retired | guest
}
```

**Response — 200**
```json
{ "message": "Signup successful", "user_id": "65a...", "user_type": "student" }
```
**Sets cookie**: `token` (HTTP-only, 30 days)

**Errors**: `400` (email already registered), `422` (validation)

---

### `POST /user/login`

Authenticate an existing user.

**Request body**
```json
{ "email": "jane@example.com", "password": "secure123" }
```

**Response — 200**
```json
{ "message": "Login successful", "user_id": "65a...", "user_type": "student" }
```
**Sets cookie**: `token` (HTTP-only, 30 days)

**Errors**: `401` (invalid email or password), `422` (validation)

---

### `GET /user/logout`

Clear the auth cookie on **this device only**. The underlying JWT is technically
still valid until expiry — for a hard global logout, use `/user/logout-all`.

**Response — 200** — `{ "message": "Logged out successfully" }`

---

### `POST /user/logout-all` 🔒

Invalidate **every** JWT this user has been issued (other browsers, other
devices, the cookie this request came in on). Done by bumping the user's
`token_version` field — the auth middleware refuses to accept any JWT whose
`tv` claim doesn't match the current value, so old tokens become unusable.

Also clears the local cookie before responding.

**Response — 200** — `{ "message": "Signed out of all devices" }`

---

### `GET /user/me` 🔒

Probe the current session. Useful for refreshing UI state (e.g. checking
whether the user has verified their email since last load).

**Response — 200**
```json
{
  "user_id": "65a...",
  "email": "jane@example.com",
  "full_name": "Jane Doe",
  "user_type": "student",
  "email_verified": false
}
```

---

### `POST /user/forgot-password`

Trigger a password-reset email. The endpoint **always returns 200** — it
never tells the caller whether the address was registered (so an attacker
can't use it to enumerate accounts). If the address exists, a single-use
token is generated, its SHA-256 hash stored in `verification_tokens`, and
an email goes out with a link to `${FRONTEND_URL}/reset-password?token=...`.

The token expires after **1 hour**.

**Request body** — `{ "email": "jane@example.com" }`

**Response — 200**
```json
{ "message": "If an account exists for that email, a reset link is on its way." }
```

---

### `POST /user/reset-password`

Consume a reset token. On success: the password is replaced, the user's
`token_version` is bumped (killing every existing session), the token is
marked `used_at`, and the local cookie is cleared.

**Request body**
```json
{
  "token": "<raw token from the email link>",
  "new_password": "newsecret123"
}
```

**Response — 200** — `{ "message": "Password reset successful" }`

**Errors**:
- `400` — invalid / already-used / expired token
- `422` — `new_password` shorter than 6 chars

---

### `POST /user/change-password` 🔒

Set a new password while logged in. Requires the current password to
prevent a stolen cookie from being used to change credentials.

Successfully changing the password bumps `token_version` (same behavior
as reset), so other devices stay signed in until they hit a protected
endpoint and get a 401 — they should then route the user to login.

**Request body**
```json
{ "current_password": "old", "new_password": "newsecret123" }
```

**Response — 200** — `{ "message": "Password changed" }`

**Errors**:
- `400` — current password wrong, or new equals current

---

### `GET /user/verify-email`

Consume an email-verification token (the link from the welcome / resend
email). Marks `email_verified=true` on the User and stamps
`email_verified_at`. The token expires after **24 hours**.

This endpoint is intentionally **public** (no auth) so users can click
the link from any browser, including one they're not logged into.

**Query**: `?token=<raw token>`

**Response — 200** — `{ "message": "Email verified" }`

**Errors**:
- `400` — invalid / already-used / expired token

---

### `POST /user/resend-verification` 🔒

Generate a fresh verification token, drop any older outstanding ones for
this user, and send the email again. No-op (returns 200) if the address
is already verified.

**Response — 200**
```json
{ "message": "Verification email sent" }
```

---

### `GET /user/guest`

Create an anonymous guest session. Returns user_id and a 24-hour JWT.
The guest document auto-deletes from MongoDB after 2 days (TTL index).
Guest tokens **don't** carry a `tv` claim — guest sessions can't be
revoked individually, they just expire.

---

## User type forms

These create the profile data for a logged-in user. After submission, the
user's `user_type` field is updated on the User document. Sub-document lists
(financial_goals, fixed_expenses, etc.) reject empty rows — the frontend
strips incomplete entries before submitting.

### `POST /userType/student` 🔒

```json
{
  "user_id": "65a...",
  "education_level": "college",           // school | college | university | other
  "institution_name": "Mumbai University",
  "living_situation": "hostel",           // hostel | family | rental | pg | other
  "monthly_allowance": 5000,
  "is_parent_funded": "yes",              // yes | no | partially
  "custom_categories": [
    { "name": "Books", "budget_limit": 1500, "actual_spent": 0 }
  ],
  "financial_goals": [
    { "name": "New laptop", "target_amount": 50000, "current_amount": 5000, "priority": "high" }
  ],
  "summary_frequency": "weekly"           // daily | weekly | bi-weekly | monthly | never
}
```

**Response — 200** — `{ "message": "Student profile saved", "user_type": "student" }`

---

### `POST /userType/employed` 🔒

```json
{
  "user_id": "65a...",
  "job_title": "Software Engineer",
  "employment_type": "full-time",         // full-time | part-time | contract | self-employed | freelance
  "company": "Acme Inc",
  "work_industry": "Tech",
  "work_location": "Bengaluru",
  "monthly_salary": 80000,
  "pay_frequency": "monthly",             // weekly | bi-weekly | semi-monthly | monthly | annually
  "additional_income_sources": [
    { "name": "Side project", "source_type": "freelance", "amount": 10000, "frequency": "monthly" }
  ],
  "has_bonuses": true,
  "bonus_details": { "amount": 50000, "frequency": "yearly" },
  "fixed_expenses": [{ "category": "Rent", "amount": 20000 }],
  "budget_limits": [],
  "financial_goals": [],
  "summary_frequency": "monthly",
  "investment_preferences": {
    "risk_tolerance": "medium",            // low | medium | high
    "interested_in": ["stocks", "mutual-funds"],
    "experience_level": "beginner"         // beginner | intermediate | expert
  }
}
```

**Response — 200** — `{ "message": "Employed profile saved", "user_type": "employed" }`

---

### `POST /userType/unemployed` 🔒

Returns 400 if a profile already exists for this user.

```json
{
  "user_id": "65a...",
  "employment_status": "actively-seeking",  // actively-seeking | taking-break | studying | caring | disabled
  "last_job_details": { "industry": "Tech", "position": "Designer", "duration": "3 years" },
  "current_income": 0,
  "income_sources": [],
  "debt": { "amount": 50000, "monthly_payment": 2000, "type": "credit card" },
  "comfort_budget": 15000,
  "runway_estimate": 90,
  "living_situation": "with-family",         // alone | with-family | with-roommates
  "has_dependents": false,
  "dependents_count": 0,
  "gig_interest": "very-open",               // not-at-all | somewhat | very-open
  "has_tools": true,
  "willing_to_relocate": true,
  "goal_priority": "build-emergency-fund",   // build-emergency-fund | reduce-debt | cover-rent | invest-small | learn-skill
  "savings_details": { "amount": 30000, "emergency_fund": 20000, "months_covered": 2 },
  "regular_expenses": [],
  "budget_limits": [],
  "financial_goals": [],
  "job_search_details": {
    "active": true,
    "applications_per_week": 5,
    "job_search_budget": 1000,
    "industries_targeted": ["Tech"],
    "skills_development": ["Python"]
  },
  "support_resources": {
    "wants_budget_help": true,
    "wants_job_resources": true,
    "wants_debt_advice": false
  }
}
```

**Response — 200** — `{ "message": "Unemployed profile saved", "user_type": "unemployed" }`

---

### `POST /userType/retired` 🔒

```json
{
  "user_id": "65a...",
  "pension": { "receives": true, "amount": 30000, "frequency": "monthly" },
  "other_income_sources": [],
  "retirement_account_withdrawals": [],
  "housing": { "mortgage_or_rent": 0, "insurance": 5000, "maintenance": 2000 },
  "healthcare": { "monthly_premium": 3000, "out_of_pocket": 1000 },
  "other_expenses": [],
  "retirement_accounts": [{ "type": "PPF", "current_value": 1500000 }],
  "other_assets": [],
  "savings_goals": [],
  "legacy_planning": {
    "beneficiaries": [
      { "name": "Spouse", "relationship": "spouse", "percentage": 60 },
      { "name": "Daughter", "relationship": "child", "percentage": 40 }
    ]
  }
}
```

**Validation**: beneficiary percentages must total ≤ 100%, otherwise the save is rejected.

**Response — 200** — `{ "message": "Retired profile saved", "user_type": "retired" }`

---

## Quiz (self-assessment)

After onboarding the user answers 10 multiple-choice questions tailored to
their type. Answers are stored on the same profile document under
`quiz_responses`, and they get fed into the AI advice prompt.

### `POST /quiz/{user_type}` 🔒

`{user_type}` is one of `student | employed | unemployed | retired`.

**Request body**
```json
{
  "user_id": "65a...",
  "answers": [
    { "question": "What % of your income do you save?", "answer": "10–20%" },
    { "question": "Your biggest expense category?", "answer": "Rent/EMI" }
  ]
}
```

**Response — 200**
```json
{ "message": "Quiz responses saved", "user_type": "employed" }
```

**Side effect**: clears the cached `ai_advice` on the profile so the next
dashboard call regenerates with the quiz signal included.

**Errors**:
- `400` — unsupported user type, invalid user_id
- `404` — profile not found (user must complete onboarding first)

---

## AI chat

Conversational follow-up powered by the user's selected AI provider
(Local Gemma by default, or Gemini / OpenAI / Anthropic / Cohere if they
opted into one in `/dashboard/settings`). The backend injects the user's
profile, self-assessment, and two RAG blocks (curated finance knowledge
+ this user's relevant past turns) as a system preamble, so each reply
is grounded in their real data plus factual context.

Every turn (user message + assistant reply) is **persisted** to the
`chat_messages` collection, grouped under a `conversations` document. The
backend is the **source of truth** for chat history — it loads the last 20
turns from MongoDB on each request and ignores whatever `history` the client
sends. The client-side `history` field is kept in the schema only for
backwards compatibility and may be empty.

Conversations work the same way as ChatGPT / Gemini / Claude:
- The first message in a new chat **implicitly creates** the conversation
  (no separate "create conversation" call). The response includes the new
  `conversation_id`; the frontend then navigates to `/dashboard/chat/<id>`.
- Sending a `conversation_id` continues that conversation — the backend
  appends both turns and bumps its `updated_at` so it floats to the top of
  the sidebar.
- Titles auto-generate from the first message (first 60 chars). Users can
  rename via `PATCH /conversations/{id}`.
- All `/conversations*` endpoints filter by the authenticated user — a
  conversation that exists but isn't yours returns `404` (no leak of which
  IDs exist).

### `POST /chat/{user_type}` 🔒

**Request body**
```json
{
  "user_id": "65a...",
  "message": "Should I prioritize paying off the loan or investing?",
  "conversation_id": "6a08...",
  "history": []
}
```

- `conversation_id` is **optional**. Omit it (or send `null`) on the first
  message of a new chat — the backend creates the conversation and returns
  the new id in the response.
- `history` is accepted for backwards compatibility but **not used** for
  building the LLM context. The backend pulls the real history from the DB.
- `message` is 1–4000 chars; outside that range returns `422`.

**Response — 200**
```json
{
  "reply": "Given your runway, prioritize the credit card...",
  "conversation_id": "6a08bf3e8c2a1d4f5e6a7b8c"
}
```

**Errors**:
- `400` — unsupported user type / invalid `user_id` / invalid `conversation_id`
- `404` — profile not found / `conversation_id` doesn't belong to you
- `200` with apologetic reply text if the AI provider fails (no 5xx leak; the user message is still persisted)

---

### `POST /chat/{user_type}/stream` 🔒

Same request body and semantics as `POST /chat/{user_type}`, but the reply
is streamed back as **Server-Sent Events** so the UI can render words as
they're generated.

The user-turn DB write happens **before** the first byte leaves the server,
and the assistant-turn write + memory upserts happen **after** the stream
cleanly closes — same durability guarantees as the non-streaming path.

**Response headers**
```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no       ← tells nginx not to pool chunks
```

**Event sequence** (each frame ends with a blank line):

```
event: meta
data: {"conversation_id": "6a08bf3e8c2a1d4f5e6a7b8c"}

event: delta
data: {"text": "Given"}

event: delta
data: {"text": " your runway,"}

...

event: done
data: {"reply": "Given your runway, prioritize the credit card..."}
```

| Event | When | Payload |
|---|---|---|
| `meta` | First — always fires before any `delta` | `{ "conversation_id": "..." }` |
| `delta` | Repeatedly, as the provider emits tokens | `{ "text": "<chunk>" }` |
| `done` | Once, after the LLM stream closes cleanly | `{ "reply": "<full text>" }` (use this as the authoritative final reply so dropped deltas don't desync) |
| `error` | Replaces `done` on failure | `{ "message": "..." }` |

If the upstream LLM connection drops mid-stream **after** some deltas have
been sent, the server flushes whatever it has and persists that partial
reply — you'll see no `done`, just the deltas you already received. Clients
should treat the assembled deltas as the final answer in that case.

**All five providers** are supported (Local Ollama, OpenAI, Anthropic,
Gemini via `streamGenerateContent?alt=sse`, Cohere). The cloud providers
each have their own SSE dialect; `_iter_sse_data` in
`backend/src/utils/ai_utils.py` normalizes them.

**Frontend usage** — see `frontend/src/lib/api.ts → api.chatStream()`,
which wraps `fetch` + `ReadableStream` and dispatches to `onMeta`,
`onDelta`, `onDone` callbacks.

**Errors**:
- `403` — `user_id` in body doesn't match the authenticated user (same as non-streaming)
- The stream body itself surfaces failures via `event: error` instead of HTTP status codes (the response status has already been committed to 200 by then)

---

## Conversation history

Per-user list of past chats — what the sidebar in `/dashboard/chat` shows.
Conversations are created implicitly by `POST /chat/{user_type}`; these
endpoints handle everything after that.

### `GET /conversations` 🔒

Returns the authenticated user's conversations, newest activity first.

**Response — 200**
```json
[
  {
    "id": "6a08bf3e8c2a1d4f5e6a7b8c",
    "title": "Should I prioritize paying off the loan or...",
    "user_type": "employed",
    "created_at": "2026-05-16T06:09:25.588Z",
    "updated_at": "2026-05-16T06:11:02.342Z"
  }
]
```

Sort order is `updated_at` descending — sending a new message in a chat
bumps it to the top automatically.

### `GET /conversations/{id}` 🔒

Returns the conversation metadata + all messages in chronological order.

**Response — 200**
```json
{
  "id": "6a08bf3e8c2a1d4f5e6a7b8c",
  "title": "Should I prioritize paying off the loan or...",
  "user_type": "employed",
  "created_at": "2026-05-16T06:09:25.588Z",
  "updated_at": "2026-05-16T06:11:02.342Z",
  "messages": [
    { "role": "user", "content": "Should I prioritize paying off the loan or investing?" },
    { "role": "assistant", "content": "Given your runway, prioritize the credit card..." }
  ]
}
```

**Errors**:
- `400` — `id` is not a valid ObjectId
- `404` — conversation doesn't exist or isn't yours

### `PATCH /conversations/{id}` 🔒

Rename a conversation. Returns the updated summary.

**Request body**
```json
{ "title": "Loan vs. investing" }
```

- `title` is 1–200 chars (trimmed on the server; longer values are
  truncated). Empty string → `400`.

**Response — 200** — the summary shape from `GET /conversations`.

### `DELETE /conversations/{id}` 🔒

Deletes the conversation **and all its messages**. The operation is
ownership-checked; it does not delete RAG embeddings created by older code
that wasn't tagged with `conversation_id`.

**Response — 204** (no body).

**Errors**:
- `400` — invalid `id`
- `404` — conversation doesn't exist or isn't yours

---

## Dashboards

All dashboards return a typed Pydantic response containing the user info,
the profile data, AI advice, and two flags the frontend uses for routing.
Advice is regenerated only if older than 7 days (or after the quiz
endpoint clears it).

### `GET /dashboard/student` 🔒

```json
{
  "needs_onboarding": false,
  "quiz_completed": true,
  "user": { "email": "jane@example.com", "full_name": "Jane Doe", "currency": "INR" },
  "student": {
    "education_level": "college",
    "institution_name": "Mumbai University",
    "living_situation": "hostel",
    "monthly_allowance": 5000,
    "is_parent_funded": "yes",
    "custom_categories": [...],
    "financial_goals": [...],
    "summary_frequency": "weekly",
    "quiz_responses": [
      { "question": "...", "answer": "..." }
    ],
    "created_at": "2026-04-27T12:00:00Z",
    "updated_at": "2026-04-27T12:30:00Z"
  },
  "ai_advice": "## Priority Recommendations\n• [High] ..."
}
```

If onboarding hasn't been completed:
```json
{ "needs_onboarding": true, "quiz_completed": false, "user": { "email": "...", "currency": "INR" } }
```

### `GET /dashboard/employed | unemployed | retired` 🔒

Same envelope, with the matching profile field (`employed`, `unemployed`,
`retired`) and its full set of fields including `quiz_responses`.

### Routing flags

The frontend uses `needs_onboarding` and `quiz_completed` together to gate
the user funnel:

| `needs_onboarding` | `quiz_completed` | Route to |
|---|---|---|
| `true` | — | `/onboarding` |
| `false` | `false` | `/quiz` |
| `false` | `true` | `/dashboard` |

---

### `POST /dashboard/guest`

Submit guest profile data. No JWT required.

```json
{
  "user_id": "65a...",
  "current_status": "exploring",          // student | employed | unemployed | retired | exploring
  "monthly_income": 25000,
  "financial_goal": [
    { "name": "Emergency fund", "target_amount": 100000, "current_amount": 5000, "priority": "high" }
  ],
  "summary_frequency": "monthly",         // weekly | monthly | never
  "help_preferences": ["budget", "savings"]
}
```

---

## Feedback

## AI settings

Each user picks the AI provider they want to use. Default is `local`
(Ollama running Gemma 4 E2B) — no key needed, no data leaves the server.
Other providers require the user's own API key.

### `GET /ai-settings/providers` 🔒

List the supported providers and their available models. Used by the
Settings page to render the provider/model picker.

**Response — 200**
```json
{
  "providers": [
    {
      "id": "local",
      "label": "Local (Ollama)",
      "models": ["gemma4:e2b", "gemma4:e4b", "gemma3:1b"],
      "needs_api_key": false
    },
    {
      "id": "gemini",
      "label": "Google Gemini",
      "models": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
      "needs_api_key": true
    },
    {
      "id": "openai",
      "label": "OpenAI",
      "models": ["gpt-4o-mini", "gpt-4o", "gpt-5"],
      "needs_api_key": true
    },
    {
      "id": "anthropic",
      "label": "Anthropic Claude",
      "models": ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-7"],
      "needs_api_key": true
    },
    {
      "id": "cohere",
      "label": "Cohere",
      "models": ["command-a-03-2025", "command-r-plus", "command-r"],
      "needs_api_key": true
    }
  ]
}
```

### `GET /ai-settings` 🔒

Returns the current user's saved provider and model, plus a `has_api_key`
boolean so the UI can show "saved" without exposing the key itself.

**Response — 200**
```json
{ "provider": "local", "model": "gemma4:e2b", "has_api_key": false }
```

### `POST /ai-settings` 🔒

Update the user's AI provider, model, and (if needed) API key.

**Request body**
```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "api_key": "sk-..."
}
```

- `api_key` is optional. Pass it the first time, or whenever rotating. Pass
  `null` (or omit) to keep the previous one. Switching to a `local` provider
  clears any saved key.
- 400 if provider is unknown, model isn't valid for that provider, or a
  cloud provider is chosen without ever setting a key.

**Response — 200** — same shape as `GET /ai-settings`.

---

### `POST /submit-feedback`

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "feedback": "RukiAI changed how I budget!"
}
```
**Response — 201** — public feedback object.

### `GET /api/feedback`

Last 50 public messages, newest first.

---

## Public pages & contact

`GET /` `/about` `/features` `/contact` `/how-it-works` — placeholder routes
returning `{"page": "<name>"}`.

`POST /send-email` — forwards a contact-form message to the admin's email.
Returns 500 if SMTP credentials are wrong.

---

## How to explore the API interactively

While the backend is running:

1. **Swagger UI** → http://localhost:8000/docs
   - For authenticated routes hit `/user/login` first; the cookie auto-attaches
2. **ReDoc** → http://localhost:8000/redoc
3. **Raw OpenAPI** → http://localhost:8000/openapi.json
   - Generate frontend types:
     ```bash
     cd frontend
     npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
     ```

---

## Common error responses

| Status | When |
|---|---|
| `400` | Invalid input (duplicate email, invalid user_id, unsupported user_type) |
| `401` | Missing/expired JWT cookie or wrong credentials |
| `404` | User or profile not found |
| `422` | Pydantic validation failed (bad email, missing required field, enum mismatch) |
| `500` | Server error (SMTP creds wrong, MongoDB unreachable) |

All errors return `{"detail": "<message>"}` (or for 422: a list of
field-by-field validation messages).

---

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how requests flow through the layers.
