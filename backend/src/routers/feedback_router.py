from fastapi import APIRouter
from src.schemas.feedback_schemas import FeedbackRequest, FeedbackResponse
from src.services.feedback_service import submit_feedback, list_feedback
from typing import List

router = APIRouter(tags=["feedback"])


@router.post("/submit-feedback", status_code=201)
async def post_feedback(data: FeedbackRequest) -> dict:
    fb = await submit_feedback(data)
    return {
        "message": "Feedback submitted successfully",
        "feedback": {"name": fb.name, "email": fb.email, "message": fb.message},
    }


@router.get("/api/feedback", response_model=List[FeedbackResponse])
async def get_feedback() -> List[FeedbackResponse]:
    items = await list_feedback()
    return [
        FeedbackResponse(name=f.name, email=f.email, message=f.message, is_public=f.is_public)
        for f in items
    ]
