from datetime import datetime
from typing import Optional, List, Any
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class RetiredData(Document):
    user_id: PydanticObjectId
    pension: Optional[Any] = None
    other_income_sources: List[Any] = Field(default_factory=list)
    retirement_account_withdrawals: List[Any] = Field(default_factory=list)
    housing: Optional[Any] = None
    healthcare: Optional[Any] = None
    other_expenses: List[Any] = Field(default_factory=list)
    retirement_accounts: List[Any] = Field(default_factory=list)
    other_assets: List[Any] = Field(default_factory=list)
    savings_goals: List[Any] = Field(default_factory=list)
    legacy_planning: Optional[Any] = None
    ai_advice: Optional[str] = None
    ai_advice_generated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "retired_data"
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True),
        ]
