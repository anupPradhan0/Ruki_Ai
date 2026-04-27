from datetime import datetime
from typing import Optional, List, Any
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class StudentData(Document):
    user_id: PydanticObjectId
    education_level: str  # school | college | university | other
    institution_name: Optional[str] = None
    living_situation: str  # hostel | family | rental | pg | other
    monthly_allowance: Optional[float] = None
    is_parent_funded: str  # yes | no | partially
    custom_categories: List[Any] = Field(default_factory=list)
    financial_goals: List[Any] = Field(default_factory=list)
    summary_frequency: str = "daily"  # daily | weekly | monthly
    ai_advice: Optional[str] = None
    ai_advice_generated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "student_data"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("education_level", ASCENDING)]),
            IndexModel([("living_situation", ASCENDING)]),
        ]
