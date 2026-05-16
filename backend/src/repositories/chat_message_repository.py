from typing import List, Optional

from beanie import PydanticObjectId

from src.models.chat_message_model import ChatMessage


async def add_message(
    user_id: PydanticObjectId,
    conversation_id: PydanticObjectId,
    role: str,
    content: str,
    user_type: Optional[str] = None,
) -> ChatMessage:
    msg = ChatMessage(
        user_id=user_id,
        conversation_id=conversation_id,
        role=role,
        content=content,
        user_type=user_type,
    )
    await msg.insert()
    return msg


async def list_messages(
    conversation_id: PydanticObjectId, user_id: PydanticObjectId
) -> List[ChatMessage]:
    """All messages for a conversation, oldest first. Filters by user_id for safety."""
    return await ChatMessage.find(
        ChatMessage.conversation_id == conversation_id,
        ChatMessage.user_id == user_id,
    ).sort("+created_at").to_list()


async def recent_messages(
    conversation_id: PydanticObjectId,
    user_id: PydanticObjectId,
    limit: int = 20,
) -> List[ChatMessage]:
    """Last `limit` messages for a conversation, returned in chronological order."""
    docs = await ChatMessage.find(
        ChatMessage.conversation_id == conversation_id,
        ChatMessage.user_id == user_id,
    ).sort("-created_at").limit(limit).to_list()
    return list(reversed(docs))
