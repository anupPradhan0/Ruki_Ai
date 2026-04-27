from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class FeedbackRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    feedback: str = Field(min_length=1, max_length=2000)  # maps to message field

    model_config = ConfigDict(str_strip_whitespace=True)


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    email: Optional[str] = None
    message: str
    is_public: bool


class EmailRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    subject: Optional[str] = Field(default=None, max_length=200)
    message: str = Field(min_length=1, max_length=5000)

    model_config = ConfigDict(str_strip_whitespace=True)
