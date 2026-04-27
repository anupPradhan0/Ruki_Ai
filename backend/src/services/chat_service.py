from fastapi import HTTPException
from beanie import PydanticObjectId

from src.schemas.chat_schemas import ChatRequest, ChatResponse
from src.repositories.student_repository import find_student_by_user_id
from src.repositories.employed_repository import find_employed_by_user_id
from src.repositories.unemployed_repository import find_unemployed_by_user_id
from src.repositories.retired_repository import find_retired_by_user_id
from src.utils.cohere_utils import get_ai_chat_response


_FINDERS = {
    "student": find_student_by_user_id,
    "employed": find_employed_by_user_id,
    "unemployed": find_unemployed_by_user_id,
    "retired": find_retired_by_user_id,
}


async def chat_with_ai(user_type: str, data: ChatRequest) -> ChatResponse:
    if user_type not in _FINDERS:
        raise HTTPException(status_code=400, detail="Unsupported user type")

    try:
        user_id = PydanticObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    profile = await _FINDERS[user_type](user_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"{user_type.capitalize()} profile not found — complete onboarding first",
        )

    history = [t.model_dump() for t in data.history]
    reply = await get_ai_chat_response(profile, user_type, history, data.message)
    return ChatResponse(reply=reply)
