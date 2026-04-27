from fastapi import HTTPException
from beanie import PydanticObjectId
from src.schemas.guest_schemas import GuestFormRequest
from src.repositories.guest_repository import (
    find_guest_by_id,
    find_guest_user_by_user_id,
    create_guest_user,
)


async def get_or_create_guest_dashboard(data: GuestFormRequest) -> dict:
    """Return existing guest profile or create one from submitted form data."""
    try:
        user_id = PydanticObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    guest = await find_guest_by_id(user_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest session not found")

    existing = await find_guest_user_by_user_id(user_id)
    if existing:
        return {"guest_user": existing.model_dump()}

    valid_priorities = {"high", "medium", "low"}
    clean_goals = []
    for g in data.financial_goal:
        if isinstance(g, dict):
            priority = g.get("priority", "medium")
            g["priority"] = priority if priority in valid_priorities else "medium"
            clean_goals.append(g)

    valid_frequencies = {"weekly", "monthly", "never"}
    frequency = data.summary_frequency if data.summary_frequency in valid_frequencies else "never"

    guest_user = await create_guest_user(
        user_id=user_id,
        current_status=data.current_status,
        monthly_income=data.monthly_income,
        financial_goal=clean_goals,
        summary_frequency=frequency,
        help_preferences=data.help_preferences,
    )
    return {"guest_user": guest_user.model_dump()}
