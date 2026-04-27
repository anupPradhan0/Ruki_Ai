# API Reference

Complete reference for all 22 backend endpoints. The interactive version with try-it-out is at **http://localhost:8000/docs** while the backend is running.

**Base URL**: `http://localhost:8000`

---

## Auth model

- All authenticated routes read a JWT from the `token` HTTP-only cookie
- Cookie is set automatically by `POST /user/signup`, `POST /user/login`, and `GET /user/guest`
- Cookie lifetime: 30 days (regular users), 24 hours (guests)
- All errors return `{ "detail": "<message>" }`

---

## Endpoint summary

| Method | Path | Auth required | Purpose |
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
{
  "message": "Signup successful",
  "user_id": "65a...",
  "user_type": "student"
}
```
**Sets cookie**: `token` (HTTP-only, 30 days)

**Errors**: `400` (email already registered), `422` (validation)

---

### `POST /user/login`

Authenticate an existing user.

**Request body**
```json
{
  "email": "jane@example.com",
  "password": "secure123"
}
```

**Response — 200**
```json
{
  "message": "Login successful",
  "user_id": "65a...",
  "user_type": "student"
}
```
**Sets cookie**: `token` (HTTP-only, 30 days)

**Errors**: `401` (invalid email or password), `422` (validation)

---

### `GET /user/logout`

Clear the auth cookie.

**Response — 200**
```json
{ "message": "Logged out successfully" }
```

---

### `GET /user/guest`

Create an anonymous guest session. The guest gets a random email and a 24-hour JWT.

**Response — 200**
```json
{
  "message": "Guest session created",
  "user_id": "65a...",
  "user_type": "guest"
}
```
**Sets cookie**: `token` (HTTP-only, 24 hours)

The guest document auto-deletes from MongoDB after 2 days (TTL index).

---

## User type forms

These create the profile data tied to a logged-in user. After submission, the user's `user_type` is set on the User document.

### `POST /userType/student` 🔒

Submit the student onboarding form.

**Request body**
```json
{
  "user_id": "65a...",                    // required
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
  "summary_frequency": "weekly"           // daily | weekly | monthly
}
```

**Response — 200**
```json
{ "message": "Student profile saved", "user_type": "student" }
```

---

### `POST /userType/update-student` 🔒

Append new goals/categories to an existing student profile (does NOT overwrite).

Same request body as `/userType/student`. Only `financial_goals` and `custom_categories` are appended.

**Response — 200**
```json
{ "message": "Student profile updated" }
```

---

### `POST /userType/employed` 🔒

Submit the employed onboarding form.

**Request body**
```json
{
  "user_id": "65a...",
  "job_title": "Software Engineer",
  "employment_type": "full-time",
  "company": "Acme Inc",
  "work_industry": "Tech",
  "work_location": "Bengaluru",
  "monthly_salary": 80000,
  "pay_frequency": "monthly",
  "additional_income_sources": [],
  "has_bonuses": true,
  "bonus_details": { "amount": 50000, "frequency": "yearly" },
  "fixed_expenses": [
    { "category": "Rent", "amount": 20000 }
  ],
  "budget_limits": [],
  "financial_goals": [],
  "summary_frequency": "monthly",
  "investment_preferences": {
    "risk_tolerance": "medium",
    "interested_in": ["stocks", "mutual-funds"],
    "experience_level": "beginner"
  }
}
```

**Response — 200**
```json
{ "message": "Employed profile saved", "user_type": "employed" }
```

---

### `POST /userType/unemployed` 🔒

Submit the unemployed onboarding form. Returns 400 if a profile already exists for this user.

**Request body** (key fields only)
```json
{
  "user_id": "65a...",
  "employment_status": "actively-seeking",  // actively-seeking | taking-break | studying | caring | disabled
  "current_income": 0,
  "comfort_budget": 15000,
  "runway_estimate": 90,
  "living_situation": "with-family",         // alone | with-family | with-roommates
  "has_dependents": false,
  "dependents_count": 0,
  "gig_interest": "very-open",               // not-at-all | somewhat | very-open
  "willing_to_relocate": true,
  "goal_priority": "build-emergency-fund",   // build-emergency-fund | reduce-debt | cover-rent | invest-small | learn-skill
  "savings_details": { "amount": 30000, "emergency_fund": 20000 },
  "support_resources": {
    "wants_budget_help": true,
    "wants_job_resources": true,
    "wants_debt_advice": false
  }
}
```

**Response — 200**
```json
{ "message": "Unemployed profile saved", "user_type": "unemployed" }
```

---

### `POST /userType/retired` 🔒

Submit the retired onboarding form.

**Request body** (key fields only)
```json
{
  "user_id": "65a...",
  "pension": { "receives": true, "amount": 30000, "frequency": "monthly" },
  "retirement_accounts": [
    { "type": "PPF", "current_value": 1500000 }
  ],
  "housing": { "mortgage_or_rent": 0, "insurance": 5000, "maintenance": 2000 },
  "healthcare": { "monthly_premium": 3000, "out_of_pocket": 1000 },
  "savings_goals": [
    { "name": "Travel fund", "target_amount": 200000, "current_amount": 50000 }
  ],
  "legacy_planning": {
    "beneficiaries": [
      { "name": "Spouse", "relationship": "spouse", "percentage": 60 },
      { "name": "Daughter", "relationship": "child", "percentage": 40 }
    ]
  }
}
```

**Validation**: beneficiary percentages must total ≤ 100%, otherwise the document save is rejected.

**Response — 200**
```json
{ "message": "Retired profile saved", "user_type": "retired" }
```

---

## Dashboards

All dashboards return a **typed Pydantic response** with the user info, the profile data, and AI-generated advice. Advice is regenerated only if older than 7 days.

### `GET /dashboard/student` 🔒

**Response — 200**
```json
{
  "needs_onboarding": false,
  "user": {
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "currency": "INR"
  },
  "student": {
    "education_level": "college",
    "institution_name": "Mumbai University",
    "living_situation": "hostel",
    "monthly_allowance": 5000,
    "is_parent_funded": "yes",
    "custom_categories": [...],
    "financial_goals": [...],
    "summary_frequency": "weekly",
    "created_at": "2026-04-27T12:00:00Z",
    "updated_at": "2026-04-27T12:30:00Z"
  },
  "ai_advice": "## Priority Recommendations\n• [High] ...\n..."
}
```

If the user hasn't completed the form yet:
```json
{
  "needs_onboarding": true,
  "user": { "email": "...", "full_name": "...", "currency": "INR" }
}
```

---

### `GET /dashboard/employed` 🔒

Same shape as `/dashboard/student` but with the `employed` field instead of `student`, containing all the employed profile fields (job_title, monthly_salary, fixed_expenses, etc.).

---

### `GET /dashboard/unemployed` 🔒

Same shape with the `unemployed` field, containing all unemployed profile fields.

---

### `GET /dashboard/retired` 🔒

Same shape with the `retired` field, containing pension, healthcare, retirement_accounts, savings_goals, legacy_planning.

---

### `POST /dashboard/guest`

Submit guest profile data. No JWT required (the user_id from the guest session is sent in the body).

**Request body**
```json
{
  "user_id": "65a...",
  "current_status": "exploring",          // student | employed | unemployed | retired | exploring
  "monthly_income": 25000,
  "financial_goal": [
    { "name": "Emergency fund", "target_amount": 100000, "current_amount": 5000, "priority": "high" }
  ],
  "summary_frequency": "monthly",         // weekly | monthly | never
  "help_preferences": ["budget", "savings"]   // budget | debt | savings | jobSearch | investing | retirement
}
```

**Response — 200**
```json
{
  "guest_user": {
    "current_status": "exploring",
    "monthly_income": 25000,
    "financial_goal": [...],
    "summary_frequency": "monthly",
    "help_preferences": ["budget", "savings"],
    "created_at": "2026-04-27T12:00:00Z"
  }
}
```

---

## Feedback

### `POST /submit-feedback`

Save a public feedback message.

**Request body**
```json
{
  "name": "Jane Doe",                  // required, 1-100 chars
  "email": "jane@example.com",         // optional, validated as email
  "feedback": "RukiAI changed how I budget!"  // required, 1-2000 chars
}
```

**Response — 201**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "RukiAI changed how I budget!",
  "is_public": true
}
```

---

### `GET /api/feedback`

Get the 50 most recent public feedback messages, sorted by newest first.

**Response — 200**
```json
[
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "RukiAI changed how I budget!",
    "is_public": true
  },
  ...
]
```

---

## Public pages & contact

### `GET /` `/about` `/features` `/contact` `/how-it-works`

Placeholder routes that return `{"page": "<name>"}`. The actual page content lives in the React frontend.

### `POST /send-email`

Forward a contact-form message to the admin's email.

**Request body**
```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Question about RukiAI",
  "message": "How does the AI advice work?"
}
```

**Response — 200**
```json
{ "message": "Email sent successfully" }
```

**Errors**: 500 if SMTP credentials are wrong or Gmail rejects.

---

## How to explore the API interactively

While the backend is running:

1. **Swagger UI** → http://localhost:8000/docs
   - Click any endpoint → "Try it out"
   - For authenticated routes: hit `/user/login` first, the cookie auto-attaches
2. **ReDoc** → http://localhost:8000/redoc
   - Cleaner reading layout
3. **Raw OpenAPI spec** → http://localhost:8000/openapi.json
   - Use this to generate frontend TypeScript types:
     ```bash
     cd frontend
     npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
     ```

---

## Common error responses

| Status | When |
|---|---|
| `400` | Invalid input (e.g. duplicate email, invalid user_id format) |
| `401` | Missing/expired JWT cookie or wrong credentials |
| `404` | User or profile not found |
| `422` | Pydantic validation failed (bad email format, missing required field, enum value not allowed) |
| `500` | Server error (e.g. SMTP credentials wrong, MongoDB unreachable) |

All errors return `{"detail": "<message>"}` or for 422: `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`.

---

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how requests flow through the layers.
