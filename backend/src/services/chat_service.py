from fastapi import HTTPException
from beanie import PydanticObjectId

from src.schemas.chat_schemas import ChatRequest, ChatResponse
from src.repositories.student_repository import find_student_by_user_id
from src.repositories.employed_repository import find_employed_by_user_id
from src.repositories.unemployed_repository import find_unemployed_by_user_id
from src.repositories.retired_repository import find_retired_by_user_id
from src.repositories.user_repository import find_user_by_id
from src.repositories import conversation_repository, chat_message_repository
from src.services import conversation_service
from src.utils.ai_utils import get_ai_chat_response, ai_settings_from_user


_FINDERS = {
    "student": find_student_by_user_id,
    "employed": find_employed_by_user_id,
    "unemployed": find_unemployed_by_user_id,
    "retired": find_retired_by_user_id,
}

_HISTORY_WINDOW = 20


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

    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    ai_settings = ai_settings_from_user(user)

    # Resolve or create the conversation.
    if data.conversation_id:
        try:
            convo_id = PydanticObjectId(data.conversation_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid conversation ID")
        convo = await conversation_repository.get_conversation(convo_id, user_id)
        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        convo = await conversation_service.start_conversation(user, user_type, data.message)
        convo_id = convo.id

    # Persist the user's turn before calling the LLM so it is never lost.
    await chat_message_repository.add_message(
        user_id=user_id,
        conversation_id=convo_id,
        role="user",
        content=data.message,
        user_type=user_type,
    )

    # Source of truth for context is the DB, not the client-sent history.
    recent = await chat_message_repository.recent_messages(convo_id, user_id, limit=_HISTORY_WINDOW)
    # Exclude the just-saved user message — `get_ai_chat_response` takes `history` + new `message` separately.
    history = [{"role": m.role, "content": m.content} for m in recent[:-1]]

    reply = await get_ai_chat_response(
        profile,
        user_type,
        history,
        data.message,
        ai_settings,
        user_id=user_id,
        conversation_id=convo_id,
    )

    await chat_message_repository.add_message(
        user_id=user_id,
        conversation_id=convo_id,
        role="assistant",
        content=reply,
        user_type=user_type,
    )
    await conversation_repository.touch(convo_id)

    return ChatResponse(reply=reply, conversation_id=str(convo_id))
