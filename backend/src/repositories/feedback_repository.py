from typing import List, Optional
from src.models.feedback_model import Feedback


async def create_feedback(name: str, message: str, email: Optional[str] = None) -> Feedback:
    fb = Feedback(name=name, email=email, message=message)
    await fb.insert()
    return fb


async def get_recent_feedback(limit: int = 50) -> List[Feedback]:
    return await Feedback.find().sort(-Feedback.created_at).limit(limit).to_list()
