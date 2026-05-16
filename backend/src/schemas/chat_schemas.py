from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    user_id: str
    message: str = Field(min_length=1, max_length=4000)
    history: List[ChatTurn] = []
    conversation_id: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str


class ConversationSummary(BaseModel):
    id: str
    title: str
    user_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ConversationDetail(ConversationSummary):
    messages: List[ChatTurn] = []


class RenameConversationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)

    model_config = ConfigDict(str_strip_whitespace=True)
