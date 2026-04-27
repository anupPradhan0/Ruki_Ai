from datetime import datetime, timedelta
from fastapi import HTTPException
from beanie import PydanticObjectId
from src.schemas.unemployed_schemas import UnemployedFormRequest
from src.repositories.unemployed_repository import (
    find_unemployed_by_user_id,
    create_unemployed_data,
    update_unemployed_ai_advice,
)
from src.repositories.user_repository import find_user_by_id, update_user_type
from src.utils.cohere_utils import get_ai_advice

_STALE_DAYS = 7


async def process_unemployed_form(data: UnemployedFormRequest) -> dict:
    """Save unemployed profile; block duplicate submissions for same user."""
    try:
        user_id = PydanticObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await find_unemployed_by_user_id(user_id)
    if existing:
        raise HTTPException(status_code=400, detail="Unemployed profile already exists")

    await create_unemployed_data(
        user_id=user_id,
        employment_status=data.employment_status,
        last_job_details=data.last_job_details,
        current_income=data.current_income,
        income_sources=data.income_sources,
        debt=data.debt,
        comfort_budget=data.comfort_budget,
        runway_estimate=data.runway_estimate,
        living_situation=data.living_situation,
        has_dependents=data.has_dependents,
        dependents_count=data.dependents_count,
        gig_interest=data.gig_interest,
        has_tools=data.has_tools,
        willing_to_relocate=data.willing_to_relocate,
        goal_priority=data.goal_priority,
        savings_details=data.savings_details,
        regular_expenses=data.regular_expenses,
        budget_limits=data.budget_limits,
        financial_goals=data.financial_goals,
        job_search_details=data.job_search_details,
        summary_frequency=data.summary_frequency,
        support_resources=data.support_resources,
    )
    await update_user_type(user_id, "unemployed")
    return {"message": "Unemployed profile saved", "user_type": "unemployed"}


async def get_unemployed_dashboard(user_id: PydanticObjectId) -> dict:
    """Return unemployed dashboard data, refreshing AI advice if stale (>7 days)."""
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    unemployed = await find_unemployed_by_user_id(user_id)
    if not unemployed:
        return {"needs_onboarding": True}

    stale = (
        unemployed.ai_advice is None
        or unemployed.ai_advice_generated_at is None
        or (datetime.utcnow() - unemployed.ai_advice_generated_at) > timedelta(days=_STALE_DAYS)
    )

    if stale:
        advice = await get_ai_advice(unemployed, "unemployed")
        await update_unemployed_ai_advice(unemployed.id, advice)
        unemployed.ai_advice = advice

    return {
        "user": {"email": user.email, "full_name": user.full_name, "currency": user.currency},
        "unemployed": unemployed.model_dump(),
        "ai_advice": unemployed.ai_advice,
    }
