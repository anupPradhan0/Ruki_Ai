from fastapi import APIRouter, Depends, HTTPException

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
    # Reject any attempt to chat / read history as another user. Without this,
    # data.user_id from the request body could target a different account.
    if data.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="user_id does not match authenticated user")
    return await chat_with_ai(user_type, data)
