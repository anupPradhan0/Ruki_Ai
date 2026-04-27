from datetime import datetime, timedelta
from fastapi import HTTPException
from beanie import PydanticObjectId
from src.schemas.employed_schemas import EmployedFormRequest
from src.repositories.employed_repository import (
    find_employed_by_user_id,
    create_employed_data,
    update_employed_ai_advice,
)
from src.repositories.user_repository import find_user_by_id, update_user_type
from src.utils.cohere_utils import get_ai_advice

_STALE_DAYS = 7


async def process_employed_form(data: EmployedFormRequest) -> dict:
    """Save employed profile and update user_type to 'employed'."""
    try:
        user_id = PydanticObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    bonus_details = data.bonus_details if data.has_bonuses else None

    await create_employed_data(
        user_id=user_id,
        job_title=data.job_title,
        employment_type=data.employment_type,
        company=data.company,
        work_industry=data.work_industry,
        work_location=data.work_location,
        monthly_salary=data.monthly_salary,
        pay_frequency=data.pay_frequency,
        additional_income_sources=data.additional_income_sources,
        has_bonuses=data.has_bonuses,
        bonus_details=bonus_details,
        fixed_expenses=data.fixed_expenses,
        budget_limits=data.budget_limits,
        financial_goals=data.financial_goals,
        summary_frequency=data.summary_frequency,
        investment_preferences=data.investment_preferences,
    )
    await update_user_type(user_id, "employed")
    return {"message": "Employed profile saved", "user_type": "employed"}


async def get_employed_dashboard(user_id: PydanticObjectId) -> dict:
    """Return employed dashboard data, refreshing AI advice if stale (>7 days)."""
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    employed = await find_employed_by_user_id(user_id)
    if not employed:
        return {"needs_onboarding": True}

    stale = (
        employed.ai_advice is None
        or employed.ai_advice_generated_at is None
        or (datetime.utcnow() - employed.ai_advice_generated_at) > timedelta(days=_STALE_DAYS)
    )

    if stale:
        advice = await get_ai_advice(employed, "employed")
        await update_employed_ai_advice(employed.id, advice)
        employed.ai_advice = advice

    return {
        "user": {"email": user.email, "full_name": user.full_name, "currency": user.currency},
        "employed": employed.model_dump(),
        "ai_advice": employed.ai_advice,
    }
