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
| POST | `/user/signup` | — | Create new user account |
| POST | `/user/login` | — | Authenticate existing user |
| GET | `/user/logout` | ✅ | Clear auth cookie |
| GET | `/user/guest` | — | Create anonymous guest session |
| POST | `/userType/student` | ✅ | Submit student onboarding form |
| POST | `/userType/update-student` | ✅ | Append goals/categories to existing student profile |
| POST | `/userType/employed` | ✅ | Submit employed onboarding form |
| POST | `/userType/unemployed` | ✅ | Submit unemployed onboarding form |
| POST | `/userType/retired` | ✅ | Submit retired onboarding form |
| **POST** | **`/quiz/{user_type}`** | ✅ | **Save 10-question self-assessment for a user type** |
| **POST** | **`/chat/{user_type}`** | ✅ | **Conversational AI follow-up (Cohere chat)** |
| GET | `/dashboard/student` | ✅ | Get student dashboard with AI advice |
| GET | `/dashboard/employed` | ✅ | Get employed dashboard with AI advice |
| GET | `/dashboard/unemployed` | ✅ | Get unemployed dashboard with AI advice |
| GET | `/dashboard/retired` | ✅ | Get retired dashboard with AI advice |
| POST | `/dashboard/guest` | — | Submit guest profile data |
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

Clear the auth cookie.

**Response — 200** — `{ "message": "Logged out successfully" }`

---

### `GET /user/guest`

Create an anonymous guest session. Returns user_id and a 24-hour JWT.
The guest document auto-deletes from MongoDB after 2 days (TTL index).

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

Conversational follow-up powered by Cohere `command-r-plus`'s chat API.
The backend injects the user's profile (and quiz answers) as a preamble,
so each reply is grounded in their real data.

No persistence on the server — the frontend keeps the conversation in
component state and sends the full history on each turn.

### `POST /chat/{user_type}` 🔒

**Request body**
```json
{
  "user_id": "65a...",
  "message": "Should I prioritize paying off the loan or investing?",
  "history": [
    { "role": "assistant", "content": "## Priority Recommendations\n• [High] Build emergency fund..." },
    { "role": "user", "content": "What about my credit card debt?" },
    { "role": "assistant", "content": "..." }
  ]
}
```

- `history` is an ordered list of prior turns. Roles are `"user"` or `"assistant"`.
- Each `content` is 1–4000 chars; messages outside that range get a 422.
- The frontend seeds `history` with the existing `ai_advice` as the first assistant message.

**Response — 200**
```json
{ "reply": "Given your runway, prioritize the credit card..." }
```

**Errors**:
- `400` — unsupported user type / invalid user_id
- `404` — profile not found
- `200` with apologetic reply text if Cohere fails (no 5xx leak)

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
