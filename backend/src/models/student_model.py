from datetime import datetime
from typing import Optional, List
from beanie import Document, PydanticObjectId, before_event, Replace, SaveChanges, Update
from pydantic import Field, ConfigDict
from pymongo import IndexModel, ASCENDING

from src.models.enums import (
    EducationLevel,
    StudentLivingSituation,
    ParentFunded,
    SummaryFrequency,
)
from src.models.sub_documents import CustomCategory, FinancialGoal, QuizAnswer


class StudentData(Document):
    user_id: PydanticObjectId
    education_level: EducationLevel
    institution_name: Optional[str] = Field(default=None, max_length=100)
    living_situation: StudentLivingSituation
    monthly_allowance: Optional[float] = Field(default=None, ge=0)
    is_parent_funded: ParentFunded
    custom_categories: List[CustomCategory] = Field(default_factory=list)
    financial_goals: List[FinancialGoal] = Field(default_factory=list)
    summary_frequency: SummaryFrequency = SummaryFrequency.DAILY
    quiz_responses: List[QuizAnswer] = Field(default_factory=list)
    ai_advice: Optional[str] = None
    ai_advice_generated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )

    @before_event(Replace, SaveChanges, Update)
    async def _touch_updated_at(self) -> None:
        self.updated_at = datetime.utcnow()

    class Settings:
        name = "student_data"
        validate_on_save = True
        use_state_management = True
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True, name="user_id_unique"),
            IndexModel([("education_level", ASCENDING)], name="education_level_idx"),
            IndexModel([("living_situation", ASCENDING)], name="living_situation_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
        ]
