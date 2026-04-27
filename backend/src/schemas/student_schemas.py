from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from src.models.enums import (
    EducationLevel,
    StudentLivingSituation,
    ParentFunded,
    SummaryFrequency,
)
from src.models.sub_documents import CustomCategory, FinancialGoal


class StudentFormRequest(BaseModel):
    user_id: str
    education_level: EducationLevel
    institution_name: Optional[str] = Field(default=None, max_length=100)
    living_situation: StudentLivingSituation
    monthly_allowance: Optional[float] = Field(default=None, ge=0)
    is_parent_funded: ParentFunded
    custom_categories: List[CustomCategory] = []
    financial_goals: List[FinancialGoal] = []
    summary_frequency: SummaryFrequency = SummaryFrequency.DAILY

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )


class StudentDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    education_level: EducationLevel
    institution_name: Optional[str] = None
    living_situation: StudentLivingSituation
    monthly_allowance: Optional[float] = None
    is_parent_funded: ParentFunded
    custom_categories: List[CustomCategory] = []
    financial_goals: List[FinancialGoal] = []
    summary_frequency: SummaryFrequency
    ai_advice: Optional[str] = None
