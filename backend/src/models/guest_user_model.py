from datetime import datetime
from typing import Optional, List, Any
from beanie import Document, PydanticObjectId
from pydantic import Field


class GuestUser(Document):
    user_id: Optional[PydanticObjectId] = None
    current_status: str  # student | employed | unemployed | retired | exploring
    monthly_income: Optional[float] = None
    financial_goal: List[Any] = Field(default_factory=list)
    summary_frequency: str = "never"  # weekly | monthly | never
    help_preferences: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "guest_users"
