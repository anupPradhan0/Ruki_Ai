from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from src.models.enums import (
    EmploymentStatus,
    UnemployedLivingSituation,
    GigInterest,
    GoalPriority,
    SummaryFrequency,
)
from src.models.sub_documents import (
    LastJobDetails,
    IncomeSource,
    DebtInfo,
    SavingsDetails,
    RegularExpense,
    BudgetLimit,
    FinancialGoal,
    JobSearchDetails,
    SupportResources,
)


class UnemployedFormRequest(BaseModel):
    user_id: str
    employment_status: Optional[EmploymentStatus] = None
    last_job_details: Optional[LastJobDetails] = None
    current_income: float = Field(default=0, ge=0)
    income_sources: List[IncomeSource] = []
    debt: Optional[DebtInfo] = None
    comfort_budget: float = Field(default=0, ge=0)
    runway_estimate: float = Field(default=0, ge=0)
    living_situation: Optional[UnemployedLivingSituation] = None
    has_dependents: bool = False
    dependents_count: int = Field(default=0, ge=0)
    gig_interest: Optional[GigInterest] = None
    has_tools: bool = True
    willing_to_relocate: bool = False
    goal_priority: Optional[GoalPriority] = None
    savings_details: Optional[SavingsDetails] = None
    regular_expenses: List[RegularExpense] = []
    budget_limits: List[BudgetLimit] = []
    financial_goals: List[FinancialGoal] = []
    job_search_details: Optional[JobSearchDetails] = None
    summary_frequency: Optional[SummaryFrequency] = None
    support_resources: Optional[SupportResources] = None

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )


class UnemployedDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    employment_status: Optional[EmploymentStatus] = None
    current_income: float = 0
    financial_goals: List[FinancialGoal] = []
    ai_advice: Optional[str] = None
