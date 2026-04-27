from datetime import datetime
from typing import Optional, List
from beanie import Document, PydanticObjectId, before_event, Replace, SaveChanges, Update
from pydantic import Field, ConfigDict
from pymongo import IndexModel, ASCENDING

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


class UnemployedData(Document):
    user_id: PydanticObjectId
    employment_status: Optional[EmploymentStatus] = None
    last_job_details: Optional[LastJobDetails] = None
    current_income: float = Field(default=0, ge=0)
    income_sources: List[IncomeSource] = Field(default_factory=list)
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
    regular_expenses: List[RegularExpense] = Field(default_factory=list)
    budget_limits: List[BudgetLimit] = Field(default_factory=list)
    financial_goals: List[FinancialGoal] = Field(default_factory=list)
    job_search_details: Optional[JobSearchDetails] = None
    summary_frequency: Optional[SummaryFrequency] = None
    support_resources: Optional[SupportResources] = None
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
        name = "unemployed_data"
        validate_on_save = True
        use_state_management = True
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True, name="user_id_unique"),
            IndexModel([("employment_status", ASCENDING)], name="employment_status_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
        ]
