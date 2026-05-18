# Frontend Plan — Expense Tracking + Savings UI

Goal: ship the screens that make the backend (see `BACKEND_PLAN.md`) feel
like a real money app — a list, a way to add, a dashboard, a budget editor.

Design principle: **less code, more effect.** Reuse what already exists —
`lib/api.ts` typed fetch, TanStack Query, Tailwind, Skeleton primitives,
toast store, Sidebar nav. No new libraries except one chart lib.

---

## Scope (4 screens, in build order)

1. `/dashboard/money` — overview (totals, category pie, monthly trend, budget bars)
2. `/dashboard/money/transactions` — list + filters + inline add/edit
3. `/dashboard/money/budget` — edit limits per category per month
4. Sidebar nav entry + dashboard-overview card linking to it

Receipt upload, CSV import, mobile-only quick-add FAB → phase 2.

---

## 1. One new dependency

```
pnpm add recharts
```

That's it. Recharts is ~70 KB gzipped, declarative, plays well with React 18
and Tailwind. No styling library, no UI kit. Use the existing Tailwind
classes for cards/containers.

---

## 2. API client — `lib/api.ts` additions

Add a `money` object next to the existing groups. ~40 lines total:

```ts
export const money = {
  list: (params: { start?; end?; category?; type?; limit?; skip? }) => …
  create: (data) => …
  update: (id, data) => …
  remove: (id) => …
  stats: (month: string) => api<StatsResponse>(`/transactions/stats/${month}`)
  budget: {
    get: (month) => …,
    upsert: (data) => …,
  }
}
```

Types live in `lib/api.ts` alongside the existing ones. No separate
`types.ts` — keep the convention.

---

## 3. Routes — TanStack file-based

Add three files (matches existing dashboard route pattern):

```
routes/dashboard.money.tsx           ← layout for the section (tab strip)
routes/dashboard.money.index.tsx     ← /dashboard/money — overview
routes/dashboard.money.transactions.tsx
routes/dashboard.money.budget.tsx
```

`dashboard.money.tsx` is a thin shell: a tab strip (Overview / Transactions
/ Budget) + `<Outlet />`. Same pattern `chat.tsx` already uses.

After adding files, `routeTree.gen.ts` regenerates automatically (already
wired in `vite.config.ts`).

---

## 4. Components — `components/pages/money/`

Six small files, all under 150 lines each:

| File | What it does |
|---|---|
| `MoneyOverview.tsx` | Totals row + `CategoryPie` + `MonthlyTrend` + `BudgetBars` |
| `TransactionsPage.tsx` | List + filter bar + inline form |
| `BudgetPage.tsx` | One row per category with editable number input |
| `TransactionRow.tsx` | One row (used by list and inline-edit) |
| `TransactionForm.tsx` | Amount, type, category, merchant, note, date |
| `charts.tsx` | `CategoryPie`, `MonthlyTrend`, `BudgetBars` — Recharts wrappers |

All chart components take **pre-shaped data** from the `stats` endpoint —
no data massaging in the component. Backend already returned
`by_category` and `daily` arrays.

---

## 5. Reuse — what NOT to build

| Need | Already exists |
|---|---|
| Loading states | `Skeleton.tsx` — add `MoneyOverviewSkeleton`, `TxnListSkeleton` (~20 lines each, compose `Bar` primitive) |
| Error toasts | `toastError(err, "Failed to load")` from `lib/toast.ts` |
| Server state | TanStack Query — `useQuery(["money", "stats", month])` |
| Cache invalidation | `qc.invalidateQueries({ queryKey: ["money"] })` after mutations |
| Forms | Native `<form>` + `useState` — same style as `OnboardingPage` and `SettingsPage`. No react-hook-form. |
| Modal for new txn | Inline expander above the list — *no modal component needed*. |
| INR formatting | `new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })` in `lib/utils.ts` as a `fmtINR()` helper |
| Date picker | Native `<input type="date">` — works on iOS/Android. No library. |
| Icons | Already have `lucide-react` — use `Wallet`, `TrendingUp`, `PieChart`, `Receipt`, `Pencil`, `Trash2`, `Plus` |

---

## 6. Sidebar integration — `components/Sidebar.tsx`

Add **one** entry to the `NAV` array:

```ts
{ to: "/dashboard/money", label: "Money", icon: Wallet }
```

That's the entire navigation change.

---

## 7. Dashboard overview card — `DashboardOverview.tsx`

Add **one** card above the existing AI Advice card:

> This month: ₹X spent · ₹Y left · top: Food
> → links to `/dashboard/money`

Reads from `money.stats(currentMonth)` via TanStack Query. ~30 lines.
Skeleton-flashes via existing `DashboardSkeleton` while loading.

---

## 8. Wireframe — `/dashboard/money` overview

```
┌──────────────────────────────────────────────────────────┐
│  Money  ·  May 2026               [‹]  May 2026  [›]    │
├──────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ Income   │  │ Spent    │  │ Net                  │   │
│  │ ₹45,000  │  │ ₹28,400  │  │ +₹16,600             │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
│                                                          │
│  ┌─────────────────────┐  ┌───────────────────────────┐ │
│  │  By Category (pie)  │  │  Daily spend (line)       │ │
│  │     [Recharts]      │  │     [Recharts]            │ │
│  └─────────────────────┘  └───────────────────────────┘ │
│                                                          │
│  Budgets                                                 │
│  Food         ████████░░  ₹6,200 / ₹8,000   (78%)        │
│  Transport    █████████░  ₹2,800 / ₹3,000   (93%)  ⚠     │
│  …                                                       │
└──────────────────────────────────────────────────────────┘
```

Month switcher is just `useState<string>("2026-05")` + two arrow buttons
that step the month. The `stats(month)` query refetches automatically.

---

## 9. Wireframe — Transactions

```
┌──────────────────────────────────────────────────────────┐
│  Transactions          [+ Add]   [Filter: All ▾] [May ▾] │
├──────────────────────────────────────────────────────────┤
│  + Add row (expands inline; no modal)                    │
│  ──────────────────────────────────────────────────────  │
│  🍔  Swiggy            Food          -₹420   May 18  ⋯   │
│  🚖  Uber              Transport     -₹230   May 18  ⋯   │
│  💼  Salary            Income      +₹45,000  May 1   ⋯   │
│  …                                                       │
└──────────────────────────────────────────────────────────┘
```

Click ⋯ → inline Edit / Delete. No separate detail page.

---

## 10. Build order

1. `lib/api.ts` additions + route files (empty shells). *Routing works.*
2. `MoneyOverview` + `stats` query + 3 charts. *Visual wow.*
3. `TransactionsPage` with list + filter. *Read works.*
4. `TransactionForm` (inline add/edit). *Full CRUD.*
5. `BudgetPage`. *Budget bars in overview light up.*
6. Sidebar entry + DashboardOverview card. *Discoverable.*

Each step is independently shippable.

---

## 11. UX rules that come for free from existing primitives

- All loading states use `Skeleton.tsx` — *no spinners on first load*.
- All mutations toast on error via `toastError(err, "Could not save")`.
- Inputs use `text-base sm:text-sm` (already the project default) so iOS
  doesn't zoom on focus.
- Full-height containers use `dvh` not `vh` (project convention) so the
  composer-style add form stays above the iOS keyboard.
- Mobile: filter bar wraps; charts stack vertically (Tailwind `lg:grid-cols-2`).

---

## 12. Out-of-scope (phase 2)

- CSV import dropzone
- Receipt photo upload → OCR
- Recurring transaction editor
- Savings-goal progress widget
- Dark mode toggle (Tailwind dark: variants — easy phase-2 win)
- Export to Excel / PDF
- PWA manifest + offline cache
