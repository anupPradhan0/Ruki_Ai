from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class EmployedFormRequest(BaseModel):
    user_id: str
    job_title: Optional[str] = None
    employment_type: Optional[str] = None
    company: Optional[str] = None
    work_industry: Optional[str] = None
    work_location: Optional[str] = None
    monthly_salary: Optional[float] = None
    pay_frequency: str = "monthly"
    additional_income_sources: List[Any] = []
    has_bonuses: bool = False
    bonus_details: Optional[Any] = None
    fixed_expenses: List[Any] = []
    budget_limits: List[Any] = []
    financial_goals: List[Any] = []
    summary_frequency: Optional[str] = None
    investment_preferences: Optional[Any] = None


class EmployedDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    job_title: Optional[str] = None
    employment_type: Optional[str] = None
    company: Optional[str] = None
    monthly_salary: Optional[float] = None
    financial_goals: List[Any] = []
    ai_advice: Optional[str] = None
