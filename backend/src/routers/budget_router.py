from fastapi import APIRouter, Depends

from src.middleware.auth_middleware import get_current_user
from src.models.user_model import User
from src.schemas.transaction_schemas import BudgetOut, BudgetUpsert
from src.services import budget_service


router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.put("", response_model=BudgetOut)
async def upsert_budget(
    data: BudgetUpsert, current_user: User = Depends(get_current_user)
) -> BudgetOut:
    return await budget_service.upsert_budget(current_user, data)


@router.get("/{month}", response_model=BudgetOut)
async def get_budget(
    month: str, current_user: User = Depends(get_current_user)
) -> BudgetOut:
    return await budget_service.get_budget(current_user, month)
