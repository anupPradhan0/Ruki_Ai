from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from beanie import PydanticObjectId

from src.middleware.auth_middleware import get_current_user
from src.models.user_model import User
from src.schemas.chat_schemas import (
    ConversationSummary,
    ConversationDetail,
    RenameConversationRequest,
)
from src.services import conversation_service


router = APIRouter(prefix="/conversations", tags=["conversations"])


def _parse_id(raw: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")


@router.get("", response_model=List[ConversationSummary])
async def list_conversations(current_user: User = Depends(get_current_user)) -> List[ConversationSummary]:
    return await conversation_service.list_summaries(current_user)


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> ConversationDetail:
    return await conversation_service.get_detail(_parse_id(conversation_id), current_user)


@router.patch("/{conversation_id}", response_model=ConversationSummary)
async def rename_conversation(
    conversation_id: str,
    data: RenameConversationRequest,
    current_user: User = Depends(get_current_user),
) -> ConversationSummary:
    return await conversation_service.rename(_parse_id(conversation_id), current_user, data.title)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
) -> Response:
    await conversation_service.delete(_parse_id(conversation_id), current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
