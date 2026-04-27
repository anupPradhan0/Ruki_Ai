from fastapi import HTTPException
from typing import List
from src.schemas.feedback_schemas import FeedbackRequest
from src.repositories.feedback_repository import create_feedback, get_recent_feedback
from src.models.feedback_model import Feedback


async def submit_feedback(data: FeedbackRequest) -> Feedback:
    """Validate and persist a new feedback entry."""
    if not data.name or not data.feedback:
        raise HTTPException(status_code=400, detail="Name and feedback are required")

    return await create_feedback(
        name=data.name,
        email=data.email,
        message=data.feedback,
    )


async def list_feedback(limit: int = 50) -> List[Feedback]:
    """Return the most recent feedback entries."""
    return await get_recent_feedback(limit=limit)
