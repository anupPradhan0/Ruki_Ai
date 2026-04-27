from typing import List, Literal
from pydantic import BaseModel, ConfigDict, Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    user_id: str
    message: str = Field(min_length=1, max_length=4000)
    history: List[ChatTurn] = []

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)


class ChatResponse(BaseModel):
    reply: str
