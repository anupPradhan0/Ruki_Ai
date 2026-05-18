from fastapi import HTTPException

from src.models.user_model import User
from src.repositories import budget_repository
from src.schemas.transaction_schemas import BudgetOut, BudgetUpsert


def _to_out(doc) -> BudgetOut:
    return BudgetOut(month=doc.month, limits=doc.limits, currency=doc.currency)


async def upsert_budget(user: User, data: BudgetUpsert) -> BudgetOut:
    limits = {str(k): float(v) for k, v in data.limits.items() if v >= 0}
    doc = await budget_repository.upsert(user.id, data.month, limits)
    return _to_out(doc)


async def get_budget(user: User, month: str) -> BudgetOut:
    doc = await budget_repository.get(user.id, month)
    if not doc:
        raise HTTPException(status_code=404, detail="Budget not found")
    return _to_out(doc)
