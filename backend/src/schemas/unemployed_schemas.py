from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class UnemployedFormRequest(BaseModel):
    user_id: str
    employment_status: Optional[str] = None
    last_job_details: Optional[Any] = None
    current_income: Optional[float] = None
    income_sources: List[Any] = []
    debt: Optional[Any] = None
    comfort_budget: Optional[float] = None
    runway_estimate: Optional[float] = None
    living_situation: Optional[str] = None
    has_dependents: bool = False
    dependents_count: int = 0
    gig_interest: Optional[str] = None
    has_tools: bool = True
    willing_to_relocate: bool = False
    goal_priority: Optional[str] = None
    savings_details: Optional[Any] = None
    regular_expenses: List[Any] = []
    budget_limits: List[Any] = []
    financial_goals: List[Any] = []
    job_search_details: Optional[Any] = None
    summary_frequency: Optional[str] = None
    support_resources: Optional[Any] = None


class UnemployedDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    employment_status: Optional[str] = None
    current_income: Optional[float] = None
    financial_goals: List[Any] = []
    ai_advice: Optional[str] = None
