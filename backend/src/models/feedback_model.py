from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field


class Feedback(Document):
    name: str
    email: Optional[str] = None
    message: str
    is_public: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "feedbacks"
