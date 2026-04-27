from typing import List
from pydantic import BaseModel, ConfigDict, Field

from src.models.sub_documents import QuizAnswer


class QuizSubmitRequest(BaseModel):
    user_id: str
    answers: List[QuizAnswer] = Field(default_factory=list)

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )
