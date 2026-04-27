from fastapi import APIRouter, Depends

from src.schemas.quiz_schemas import QuizSubmitRequest
from src.schemas.common_schemas import MessageResponse
from src.services.quiz_service import save_quiz_responses
from src.middleware.auth_middleware import get_current_user
from src.models.user_model import User

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/{user_type}", response_model=MessageResponse)
async def submit_quiz(
    user_type: str,
    data: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    return await save_quiz_responses(user_type, data.user_id, data.answers)
