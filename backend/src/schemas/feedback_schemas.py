from typing import Optional
from pydantic import BaseModel, ConfigDict


class FeedbackRequest(BaseModel):
    name: str
    email: Optional[str] = None
    feedback: str  # maps to message field in model


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    email: Optional[str] = None
    message: str
    is_public: bool


class EmailRequest(BaseModel):
    full_name: str
    email: str
    subject: Optional[str] = None
    message: str
