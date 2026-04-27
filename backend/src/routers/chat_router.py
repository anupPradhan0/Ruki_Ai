from fastapi import APIRouter, Depends

from src.schemas.chat_schemas import ChatRequest, ChatResponse
from src.services.chat_service import chat_with_ai
from src.middleware.auth_middleware import get_current_user
from src.models.user_model import User

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/{user_type}", response_model=ChatResponse)
async def chat(
    user_type: str,
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    return await chat_with_ai(user_type, data)
