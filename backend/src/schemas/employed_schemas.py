from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from src.models.enums import EmploymentType, PayFrequency, SummaryFrequency
from src.models.sub_documents import (
    IncomeSource,
    BonusDetails,
    FixedExpense,
    BudgetLimit,
    FinancialGoal,
    InvestmentPreferences,
)


class EmployedFormRequest(BaseModel):
    user_id: str
    job_title: Optional[str] = Field(default=None, max_length=100)
    employment_type: Optional[EmploymentType] = None
    company: Optional[str] = Field(default=None, max_length=100)
    work_industry: Optional[str] = Field(default=None, max_length=100)
    work_location: Optional[str] = Field(default=None, max_length=100)
    monthly_salary: Optional[float] = Field(default=None, ge=0)
    pay_frequency: PayFrequency = PayFrequency.MONTHLY
    additional_income_sources: List[IncomeSource] = []
    has_bonuses: bool = False
    bonus_details: Optional[BonusDetails] = None
    fixed_expenses: List[FixedExpense] = []
    budget_limits: List[BudgetLimit] = []
    financial_goals: List[FinancialGoal] = []
    summary_frequency: Optional[SummaryFrequency] = None
    investment_preferences: Optional[InvestmentPreferences] = None

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )


class EmployedDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    job_title: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    company: Optional[str] = None
    monthly_salary: Optional[float] = None
    financial_goals: List[FinancialGoal] = []
    ai_advice: Optional[str] = None
