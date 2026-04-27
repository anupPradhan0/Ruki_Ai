from typing import List
from fastapi import APIRouter

from src.schemas.feedback_schemas import FeedbackRequest, FeedbackResponse
from src.services.feedback_service import submit_feedback, list_feedback

router = APIRouter(tags=["feedback"])


@router.post("/submit-feedback", response_model=FeedbackResponse, status_code=201)
async def post_feedback(data: FeedbackRequest) -> FeedbackResponse:
    return await submit_feedback(data)


@router.get("/api/feedback", response_model=List[FeedbackResponse])
async def get_feedback() -> List[FeedbackResponse]:
    return await list_feedback()
