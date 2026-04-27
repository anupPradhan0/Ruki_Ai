from typing import List
from fastapi import HTTPException

from src.schemas.feedback_schemas import FeedbackRequest, FeedbackResponse
from src.repositories.feedback_repository import create_feedback, get_recent_feedback


async def submit_feedback(data: FeedbackRequest) -> FeedbackResponse:
    """Validate and persist a new feedback entry, return the saved record."""
    if not data.name or not data.feedback:
        raise HTTPException(status_code=400, detail="Name and feedback are required")

    fb = await create_feedback(
        name=data.name,
        email=data.email,
        message=data.feedback,
    )
    return FeedbackResponse.model_validate(fb)


async def list_feedback(limit: int = 50) -> List[FeedbackResponse]:
    """Return the most recent feedback entries as typed Pydantic responses."""
    items = await get_recent_feedback(limit=limit)
    return [FeedbackResponse.model_validate(f) for f in items]
