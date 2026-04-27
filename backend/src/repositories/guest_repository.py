from typing import Optional, List, Any
from beanie import PydanticObjectId
from src.models.guest_model import Guest
from src.models.guest_user_model import GuestUser


async def create_guest(email: str, hashed_password: str) -> Guest:
    guest = Guest(email=email, hashed_password=hashed_password, user_type="guest")
    await guest.insert()
    return guest


async def find_guest_by_id(guest_id: PydanticObjectId) -> Optional[Guest]:
    return await Guest.get(guest_id)


async def find_guest_user_by_user_id(user_id: PydanticObjectId) -> Optional[GuestUser]:
    return await GuestUser.find_one(GuestUser.user_id == user_id)


async def create_guest_user(
    user_id: PydanticObjectId,
    current_status: str,
    monthly_income: Optional[float],
    financial_goal: List[Any],
    summary_frequency: str,
    help_preferences: List[str],
) -> GuestUser:
    guest_user = GuestUser(
        user_id=user_id,
        current_status=current_status,
        monthly_income=monthly_income,
        financial_goal=financial_goal,
        summary_frequency=summary_frequency,
        help_preferences=help_preferences,
    )
    await guest_user.insert()
    return guest_user
