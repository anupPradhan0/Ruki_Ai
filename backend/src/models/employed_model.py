from datetime import datetime
from typing import Optional, List
from beanie import Document, PydanticObjectId, before_event, Replace, SaveChanges, Update
from pydantic import Field, ConfigDict, model_validator
from pymongo import IndexModel, ASCENDING

from src.models.enums import EmploymentType, PayFrequency, SummaryFrequency
from src.models.sub_documents import (
    IncomeSource,
    BonusDetails,
    FixedExpense,
    BudgetLimit,
    FinancialGoal,
    InvestmentPreferences,
)


class EmployedData(Document):
    user_id: PydanticObjectId
    job_title: Optional[str] = Field(default=None, max_length=100)
    employment_type: Optional[EmploymentType] = None
    company: Optional[str] = Field(default=None, max_length=100)
    work_industry: Optional[str] = Field(default=None, max_length=100)
    work_location: Optional[str] = Field(default=None, max_length=100)
    monthly_salary: Optional[float] = Field(default=None, ge=0)
    pay_frequency: PayFrequency = PayFrequency.MONTHLY
    additional_income_sources: List[IncomeSource] = Field(default_factory=list)
    has_bonuses: bool = False
    bonus_details: Optional[BonusDetails] = None
    fixed_expenses: List[FixedExpense] = Field(default_factory=list)
    budget_limits: List[BudgetLimit] = Field(default_factory=list)
    financial_goals: List[FinancialGoal] = Field(default_factory=list)
    summary_frequency: Optional[SummaryFrequency] = None
    investment_preferences: Optional[InvestmentPreferences] = None
    ai_advice: Optional[str] = None
    ai_advice_generated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )

    @model_validator(mode="after")
    def _validate_bonus_consistency(self) -> "EmployedData":
        # If has_bonuses=False, ignore any bonus_details
        if not self.has_bonuses:
            self.bonus_details = None
        return self

    @before_event(Replace, SaveChanges, Update)
    async def _touch_updated_at(self) -> None:
        self.updated_at = datetime.utcnow()

    class Settings:
        name = "employed_data"
        validate_on_save = True
        use_state_management = True
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True, name="user_id_unique"),
            IndexModel([("work_industry", ASCENDING)], name="work_industry_idx"),
            IndexModel([("employment_type", ASCENDING)], name="employment_type_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
        ]
