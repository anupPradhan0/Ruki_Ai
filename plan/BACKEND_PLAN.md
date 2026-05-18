# Backend Plan — Expense Tracking + Savings

Goal: turn Ruki AI into a real money copilot. Add transactions, budgets, and
"chat with your money" so the existing LLM/RAG stack actually answers
questions about the user's real spending.

Design principle: **less code, more effect.** Reuse the existing layered
architecture (Router → Service → Repository → Model). One new collection
does 90% of the work. No new dependencies.

---

## Scope (5 features, in build order)

1. Transactions (CRUD + list with filters)
2. Categories (fixed enum, no separate collection)
3. Budgets (one doc per user/month, embedded per-category limits)
4. Stats endpoint (one aggregation pipeline → powers all charts)
5. Chat-with-your-money (tool the LLM can call mid-chat)

CSV import, recurring expenses, receipt OCR → phase 2 (separate file).

---

## 1. Data model — one collection, not five

### `models/transaction_model.py` (new)

```python
class Transaction(Document):
    user_id: PydanticObjectId
    amount: float          # always positive
    type: TxnType          # "expense" | "income"
    category: Category     # enum below
    merchant: str = ""     # free text, e.g. "Swiggy"
    note: str = ""
    occurred_at: datetime  # user-set date (not created_at)
    currency: str = "INR"
    created_at, updated_at

    class Settings:
        name = "transactions"
        indexes = [
            IndexModel([("user_id", 1), ("occurred_at", -1)]),  # list + filters
            IndexModel([("user_id", 1), ("category", 1)]),      # category drilldown
        ]
```

### `models/enums.py` — extend

```python
class TxnType(str, Enum): EXPENSE = "expense"; INCOME = "income"
class Category(str, Enum):
    FOOD = "food"; TRANSPORT = "transport"; RENT = "rent"; BILLS = "bills"
    SHOPPING = "shopping"; ENTERTAINMENT = "entertainment"; HEALTH = "health"
    EDUCATION = "education"; SAVINGS = "savings"; INCOME_SAL = "salary"
    INCOME_OTHER = "other_income"; OTHER = "other"
```

Fixed enum > separate `categories` collection. Saves a join, prevents typos,
and the LLM can be told the closed list. Custom categories = phase 2.

### `models/budget_model.py` (new)

```python
class Budget(Document):
    user_id: PydanticObjectId
    month: str             # "2026-05" — string is sortable + index-friendly
    limits: dict[str, float]  # {"food": 8000, "transport": 3000}
    currency: str = "INR"
    class Settings:
        indexes = [IndexModel([("user_id", 1), ("month", 1)], unique=True)]
```

One doc per user per month. Embedded limits = no nested collection.

Register both in `db/database.py`.

---

## 2. Schemas — `schemas/transaction_schemas.py`

```python
class TransactionCreate(BaseModel):
    amount: float = Field(gt=0)
    type: TxnType
    category: Category
    merchant: str = ""
    note: str = ""
    occurred_at: datetime

class TransactionUpdate(BaseModel):
    # all Optional, same fields

class TransactionOut(BaseModel):
    id: str; amount: float; type: TxnType; category: Category
    merchant: str; note: str; occurred_at: datetime

class TransactionListResponse(BaseModel):
    items: list[TransactionOut]
    total_count: int
    total_expense: float
    total_income: float

class BudgetUpsert(BaseModel):
    month: str  # "YYYY-MM"
    limits: dict[Category, float]

class StatsResponse(BaseModel):
    month: str
    by_category: dict[Category, float]   # spend
    daily: list[dict]                    # [{"date": "2026-05-01", "spend": 420.0}]
    total_expense: float
    total_income: float
    budget: dict[Category, float] | None
    budget_used_pct: dict[Category, float] | None
```

All `TransactionOut.id` serialization uses the existing pattern from
`chat_schemas.py` — `str(doc.id)`.

---

## 3. Repository — `repositories/transaction_repository.py`

Six functions, nothing else:

```python
async def create(txn: Transaction) -> Transaction
async def get(txn_id, user_id) -> Transaction | None     # ownership baked in
async def update(txn_id, user_id, data: dict) -> Transaction | None
async def delete(txn_id, user_id) -> bool
async def list_for_user(user_id, *, start, end, category, type_, limit, skip)
async def aggregate_month(user_id, month: str) -> dict   # returns by_category + daily
```

`aggregate_month` does the heavy lifting in **one Mongo aggregation pipeline**
(group by `category` and group by date-trunc-to-day, returned together via
`$facet`). One DB hit → all chart data. Frontend doesn't compute anything.

`repositories/budget_repository.py`:

```python
async def upsert(user_id, month, limits) -> Budget
async def get(user_id, month) -> Budget | None
```

---

## 4. Services

### `services/transaction_service.py`

- `create_transaction(user, data)` — build doc, save, return out-schema.
- `list_transactions(user, filters)` — calls repo, sums totals from the same
  page (good enough for v1; do a tiny second aggregate only if `total_count`
  exceeds the page).
- `update_transaction`, `delete_transaction` — 404 on `None`, identical
  pattern to `conversation_service`.
- `get_month_stats(user, month)` — calls `aggregate_month` + `budget_repo.get`,
  computes `budget_used_pct` here (service does the math, not the repo).

### `services/budget_service.py`

- `upsert_budget(user, data)` — month validator: regex `^\d{4}-\d{2}$`.
- `get_budget(user, month)`.

### Reuse, don't add — AI integration

Extend `utils/ai_utils.py → _extract_essential_fields()` so the user's
**last 30 days of spending summary** (top-3 categories, total spend, biggest
single expense) is injected as a new block in `_build_advice_prompt` and
`_build_chat_system`. ~20 lines. No new RAG pipeline needed.

Add **one** helper in `services/chat_service.py`: before the LLM call, if the
user's message matches a money-question regex (`spent|spend|budget|left|how
much|category`), prepend a "RECENT_SPEND" block built from
`aggregate_month(now)` to the system prompt. Cheap, no tool-calling
machinery, works on every provider.

---

## 5. Routers

### `routers/transaction_router.py`

```
POST   /transactions               create
GET    /transactions?start=&end=&category=&type=&limit=&skip=
GET    /transactions/{id}
PATCH  /transactions/{id}
DELETE /transactions/{id}
GET    /transactions/stats/{month} → StatsResponse   # "2026-05"
```

### `routers/budget_router.py`

```
PUT  /budgets                      upsert (body has month)
GET  /budgets/{month}
```

Wire both into `main.py` next to existing router includes. Both depend on
`get_current_user` — ownership is enforced via repo filters, not asserted in
the router.

---

## 6. Why this stays small

| Concern | Old way | This plan |
|---|---|---|
| Per-month rollup | client computes | one `$facet` aggregation |
| Categories | separate collection + CRUD | fixed enum (12 entries) |
| Budgets | one row per category per month | one doc per user-month with embedded dict |
| AI sees spending | new tool-calling layer | reuse `_extract_essential_fields` |
| Chart data | three endpoints | one `/transactions/stats/{month}` |

Total new files: **6** (2 models, 1 schema, 2 repos, 2 services, 2 routers).
Total new endpoints: **9**. No new pip packages.

---

## 7. Build order (cut-points so you can stop anywhere)

1. Models + enum + register in `database.py` — *can run the app, no API yet.*
2. Schemas + transaction repo + service + router (CRUD only) — *frontend can list/add.*
3. `aggregate_month` + `/stats/{month}` — *charts work.*
4. Budgets (model, repo, service, router) — *budget bars work.*
5. AI prompt injection in `ai_utils.py` + chat regex hook — *AI knows your money.*

Each step is independently shippable. Stop after step 2 and you already
have a working expense tracker.

---

## 8. Out-of-scope (phase 2, separate plan)

- CSV / bank-statement import (use existing LLM for auto-categorization)
- Recurring expenses (cron-like generator)
- Receipt OCR via Gemini Vision
- UPI screenshot parsing
- Savings goals (re-use Budget model, just `category = "savings"` + target)
- Multi-currency conversion
- Shared budgets / family accounts
