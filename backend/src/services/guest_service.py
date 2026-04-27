from fastapi import HTTPException
from beanie import PydanticObjectId

from src.schemas.guest_schemas import (
    GuestFormRequest,
    GuestDashboardResponse,
    GuestProfileSummary,
)
from src.repositories.guest_repository import (
    find_guest_by_id,
    find_guest_user_by_user_id,
    create_guest_user,
)


async def get_or_create_guest_dashboard(data: GuestFormRequest) -> GuestDashboardResponse:
    """Return existing guest profile, or create one from the submitted form data."""
    try:
        user_id = PydanticObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    guest = await find_guest_by_id(user_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest session not found")

    existing = await find_guest_user_by_user_id(user_id)
    if existing:
        return GuestDashboardResponse(guest_user=GuestProfileSummary.model_validate(existing))

    guest_user = await create_guest_user(
        user_id=user_id,
        current_status=data.current_status,
        monthly_income=data.monthly_income,
        financial_goal=[g.model_dump(by_alias=True) for g in data.financial_goal],
        summary_frequency=data.summary_frequency,
        help_preferences=[hp.value if hasattr(hp, "value") else hp for hp in data.help_preferences],
    )
    return GuestDashboardResponse(guest_user=GuestProfileSummary.model_validate(guest_user))
