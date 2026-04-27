from datetime import datetime, timedelta
from fastapi import HTTPException
from beanie import PydanticObjectId
from src.schemas.retired_schemas import RetiredFormRequest
from src.repositories.retired_repository import (
    find_retired_by_user_id,
    create_retired_data,
    update_retired_ai_advice,
)
from src.repositories.user_repository import find_user_by_id, update_user_type
from src.utils.cohere_utils import get_ai_advice

_STALE_DAYS = 7


async def process_retired_form(data: RetiredFormRequest) -> dict:
    """Save retired profile and update user_type to 'retired'."""
    try:
        user_id = PydanticObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await create_retired_data(
        user_id=user_id,
        pension=data.pension,
        other_income_sources=data.other_income_sources,
        retirement_account_withdrawals=data.retirement_account_withdrawals,
        housing=data.housing,
        healthcare=data.healthcare,
        other_expenses=data.other_expenses,
        retirement_accounts=data.retirement_accounts,
        other_assets=data.other_assets,
        savings_goals=data.savings_goals,
        legacy_planning=data.legacy_planning,
    )
    await update_user_type(user_id, "retired")
    return {"message": "Retired profile saved", "user_type": "retired"}


async def get_retired_dashboard(user_id: PydanticObjectId) -> dict:
    """Return retired dashboard data, refreshing AI advice if stale (>7 days)."""
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    retired = await find_retired_by_user_id(user_id)
    if not retired:
        return {"needs_onboarding": True}

    stale = (
        retired.ai_advice is None
        or retired.ai_advice_generated_at is None
        or (datetime.utcnow() - retired.ai_advice_generated_at) > timedelta(days=_STALE_DAYS)
    )

    if stale:
        advice = await get_ai_advice(retired, "retired")
        await update_retired_ai_advice(retired.id, advice)
        retired.ai_advice = advice

    return {
        "user": {"email": user.email, "full_name": user.full_name, "currency": user.currency},
        "retired": retired.model_dump(),
        "ai_advice": retired.ai_advice,
    }
