from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId

from src.models.conversation_model import Conversation
from src.models.chat_message_model import ChatMessage


async def create_conversation(
    user_id: PydanticObjectId,
    user_type: Optional[str],
    title: str,
) -> Conversation:
    convo = Conversation(user_id=user_id, user_type=user_type, title=title)
    await convo.insert()
    return convo


async def list_conversations(user_id: PydanticObjectId) -> List[Conversation]:
    return await Conversation.find(Conversation.user_id == user_id).sort("-updated_at").to_list()


async def get_conversation(
    conversation_id: PydanticObjectId, user_id: PydanticObjectId
) -> Optional[Conversation]:
    convo = await Conversation.get(conversation_id)
    if not convo or convo.user_id != user_id:
        return None
    return convo


async def update_title(
    conversation_id: PydanticObjectId, user_id: PydanticObjectId, title: str
) -> Optional[Conversation]:
    convo = await get_conversation(conversation_id, user_id)
    if not convo:
        return None
    convo.title = title
    convo.updated_at = datetime.utcnow()
    await convo.save()
    return convo


async def touch(conversation_id: PydanticObjectId) -> None:
    convo = await Conversation.get(conversation_id)
    if convo:
        convo.updated_at = datetime.utcnow()
        await convo.save()


async def delete_conversation(
    conversation_id: PydanticObjectId, user_id: PydanticObjectId
) -> bool:
    convo = await get_conversation(conversation_id, user_id)
    if not convo:
        return False
    await ChatMessage.find(ChatMessage.conversation_id == conversation_id).delete()
    await convo.delete()
    return True
