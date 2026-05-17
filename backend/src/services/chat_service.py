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
from src.services.memory_writer import persist_turn, schedule
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
    user_msg = await chat_message_repository.add_message(
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

    reply, query_vec = await get_ai_chat_response(
        profile,
        user_type,
        history,
        data.message,
        ai_settings,
        user_id=user_id,
        conversation_id=convo_id,
    )

    assistant_msg = await chat_message_repository.add_message(
        user_id=user_id,
        conversation_id=convo_id,
        role="assistant",
        content=reply,
        user_type=user_type,
    )
    await conversation_repository.touch(convo_id)

    # Fire-and-forget Qdrant persistence. `schedule()` holds a strong ref so
    # the task can't be GC'd mid-flight; each persist_turn back-fills its
    # ChatMessage row's vector_id after a successful upsert.
    schedule(persist_turn(
        user_id=user_id,
        role="user",
        text=data.message,
        user_type=user_type,
        embedding=query_vec or None,
        conversation_id=convo_id,
        chat_message_id=user_msg.id,
    ))
    schedule(persist_turn(
        user_id=user_id,
        role="assistant",
        text=reply,
        user_type=user_type,
        conversation_id=convo_id,
        chat_message_id=assistant_msg.id,
    ))

    return ChatResponse(reply=reply, conversation_id=str(convo_id))
