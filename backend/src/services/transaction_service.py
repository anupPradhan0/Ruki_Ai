from calendar import monthrange
from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from fastapi import HTTPException

from src.models.transaction_model import Transaction
from src.models.user_model import User
from src.repositories import budget_repository, transaction_repository
from src.schemas.transaction_schemas import (
    DailyPoint,
    StatsResponse,
    TransactionCreate,
    TransactionListResponse,
    TransactionOut,
    TransactionUpdate,
)


def _month_bounds(month: str) -> tuple[datetime, datetime]:
    """Parse 'YYYY-MM' into [start, end) datetime range. Raises 400 on bad input."""
    try:
        year, mo = month.split("-")
        y, m = int(year), int(mo)
        last = monthrange(y, m)[1]
        start = datetime(y, m, 1)
        end = datetime(y, m, last, 23, 59, 59, 999000)
        return start, end
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid month format (expected YYYY-MM)")


def _to_out(t: Transaction) -> TransactionOut:
    return TransactionOut(
        id=str(t.id),
        amount=t.amount,
        type=t.type,
        category=t.category,
        merchant=t.merchant,
        note=t.note,
        occurred_at=t.occurred_at,
        currency=t.currency,
    )


async def create_transaction(user: User, data: TransactionCreate) -> TransactionOut:
    txn = Transaction(
        user_id=user.id,
        amount=data.amount,
        type=data.type,
        category=data.category,
        merchant=data.merchant,
        note=data.note,
        occurred_at=data.occurred_at,
        currency=user.currency,
    )
    await transaction_repository.create(txn)
    return _to_out(txn)


async def list_transactions(
    user: User,
    *,
    start: Optional[datetime],
    end: Optional[datetime],
    category: Optional[str],
    type_: Optional[str],
    limit: int,
    skip: int,
) -> TransactionListResponse:
    items, total = await transaction_repository.list_for_user(
        user.id, start=start, end=end, category=category, type_=type_, limit=limit, skip=skip
    )
    return TransactionListResponse(items=[_to_out(t) for t in items], total_count=total)


async def get_transaction(txn_id: PydanticObjectId, user: User) -> TransactionOut:
    doc = await transaction_repository.get(txn_id, user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _to_out(doc)


async def update_transaction(
    txn_id: PydanticObjectId, user: User, data: TransactionUpdate
) -> TransactionOut:
    doc = await transaction_repository.get(txn_id, user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Transaction not found")

    patch = data.model_dump(exclude_unset=True)
    for field, value in patch.items():
        setattr(doc, field, value)
    await doc.save()
    return _to_out(doc)


async def delete_transaction(txn_id: PydanticObjectId, user: User) -> None:
    ok = await transaction_repository.delete(txn_id, user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transaction not found")


async def get_month_stats(user: User, month: str) -> StatsResponse:
    start, end = _month_bounds(month)
    agg = await transaction_repository.aggregate_month(user.id, start, end)

    by_category: dict[str, float] = {row["_id"]: row["total"] for row in agg.get("by_category", [])}

    daily_map: dict[str, dict[str, float]] = {}
    for row in agg.get("daily", []):
        date = row["_id"]["date"]
        kind = row["_id"]["type"]
        daily_map.setdefault(date, {"expense": 0.0, "income": 0.0})[kind] = row["total"]
    daily = [
        DailyPoint(date=d, expense=v["expense"], income=v["income"])
        for d, v in sorted(daily_map.items())
    ]

    total_expense = 0.0
    total_income = 0.0
    for row in agg.get("totals", []):
        if row["_id"] == "expense":
            total_expense = row["total"]
        elif row["_id"] == "income":
            total_income = row["total"]

    budget_doc = await budget_repository.get(user.id, month)
    budget = budget_doc.limits if budget_doc else None
    budget_used_pct: Optional[dict[str, float]] = None
    if budget:
        budget_used_pct = {
            cat: round((by_category.get(cat, 0.0) / limit) * 100, 1) if limit > 0 else 0.0
            for cat, limit in budget.items()
        }

    return StatsResponse(
        month=month,
        by_category=by_category,
        daily=daily,
        total_expense=total_expense,
        total_income=total_income,
        budget=budget,
        budget_used_pct=budget_used_pct,
    )


async def recent_spend_summary(user_id: PydanticObjectId, days: int = 30) -> dict:
    """Compact summary used by ai_utils to inject user spending into prompts."""
    from datetime import timedelta

    end = datetime.utcnow()
    start = end - timedelta(days=days)
    agg = await transaction_repository.aggregate_month(user_id, start, end)
    by_category: dict[str, float] = {r["_id"]: r["total"] for r in agg.get("by_category", [])}
    top = sorted(by_category.items(), key=lambda kv: -kv[1])[:3]
    totals = {r["_id"]: r["total"] for r in agg.get("totals", [])}
    return {
        "days": days,
        "total_expense": totals.get("expense", 0.0),
        "total_income": totals.get("income", 0.0),
        "top_categories": top,
    }
