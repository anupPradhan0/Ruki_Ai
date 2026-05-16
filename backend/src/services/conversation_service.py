from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import HTTPException

from src.models.user_model import User
from src.repositories import conversation_repository, chat_message_repository
from src.schemas.chat_schemas import ChatTurn, ConversationSummary, ConversationDetail


_TITLE_MAX = 60


def _auto_title(first_message: str) -> str:
    text = " ".join(first_message.split())
    if len(text) <= _TITLE_MAX:
        return text or "New chat"
    return text[: _TITLE_MAX - 1].rstrip() + "…"


async def start_conversation(
    user: User, user_type: Optional[str], first_message: str
):
    return await conversation_repository.create_conversation(
        user_id=user.id,
        user_type=user_type,
        title=_auto_title(first_message),
    )


async def list_summaries(user: User) -> List[ConversationSummary]:
    convos = await conversation_repository.list_conversations(user.id)
    return [
        ConversationSummary(
            id=str(c.id),
            title=c.title,
            user_type=c.user_type,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in convos
    ]


async def get_detail(conversation_id: PydanticObjectId, user: User) -> ConversationDetail:
    convo = await conversation_repository.get_conversation(conversation_id, user.id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = await chat_message_repository.list_messages(conversation_id, user.id)
    return ConversationDetail(
        id=str(convo.id),
        title=convo.title,
        user_type=convo.user_type,
        created_at=convo.created_at,
        updated_at=convo.updated_at,
        messages=[ChatTurn(role=m.role, content=m.content) for m in msgs],
    )


async def rename(conversation_id: PydanticObjectId, user: User, title: str) -> ConversationSummary:
    clean = title.strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    if len(clean) > 200:
        clean = clean[:200]

    convo = await conversation_repository.update_title(conversation_id, user.id, clean)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationSummary(
        id=str(convo.id),
        title=convo.title,
        user_type=convo.user_type,
        created_at=convo.created_at,
        updated_at=convo.updated_at,
    )


async def delete(conversation_id: PydanticObjectId, user: User) -> None:
    ok = await conversation_repository.delete_conversation(conversation_id, user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
