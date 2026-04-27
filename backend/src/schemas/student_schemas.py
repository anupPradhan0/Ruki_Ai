from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class StudentFormRequest(BaseModel):
    user_id: str
    education_level: str
    institution_name: Optional[str] = None
    living_situation: str
    monthly_allowance: Optional[float] = None
    is_parent_funded: str
    custom_categories: List[Any] = []
    financial_goals: List[Any] = []
    summary_frequency: str = "daily"


class StudentDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    education_level: str
    institution_name: Optional[str] = None
    living_situation: str
    monthly_allowance: Optional[float] = None
    is_parent_funded: str
    custom_categories: List[Any] = []
    financial_goals: List[Any] = []
    summary_frequency: str
    ai_advice: Optional[str] = None
