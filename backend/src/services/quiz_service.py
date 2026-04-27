from typing import List
from fastapi import HTTPException
from beanie import PydanticObjectId

from src.models.sub_documents import QuizAnswer
from src.schemas.common_schemas import MessageResponse
from src.repositories.student_repository import find_student_by_user_id
from src.repositories.employed_repository import find_employed_by_user_id
from src.repositories.unemployed_repository import find_unemployed_by_user_id
from src.repositories.retired_repository import find_retired_by_user_id


_FINDERS = {
    "student": find_student_by_user_id,
    "employed": find_employed_by_user_id,
    "unemployed": find_unemployed_by_user_id,
    "retired": find_retired_by_user_id,
}


async def save_quiz_responses(
    user_type: str, user_id_str: str, answers: List[QuizAnswer]
) -> MessageResponse:
    """Persist quiz answers on the matching profile document."""
    if user_type not in _FINDERS:
        raise HTTPException(status_code=400, detail="Unsupported user type")

    try:
        user_id = PydanticObjectId(user_id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    profile = await _FINDERS[user_type](user_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"{user_type.capitalize()} profile not found — complete onboarding first",
        )

    # Drop the cached AI advice so the next dashboard load regenerates with the
    # quiz signal included.
    profile.quiz_responses = answers
    profile.ai_advice = None
    profile.ai_advice_generated_at = None
    await profile.save()

    return MessageResponse(message="Quiz responses saved", user_type=user_type)
