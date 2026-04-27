"""Reusable embedded document schemas used inside Beanie Documents."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from src.models.enums import (
    Priority,
    PayFrequency,
    RiskTolerance,
    ExperienceLevel,
)


class _Base(BaseModel):
    """Strict-by-default sub-document base."""
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )


# ── Generic ────────────────────────────────────────────────────────────────

class FinancialGoal(_Base):
    name: str = Field(min_length=1, max_length=100)
    target_amount: float = Field(gt=0, alias="goalAmount")
    current_amount: float = Field(default=0, ge=0, alias="savedAmount")
    target_date: Optional[datetime] = None
    priority: Priority = Priority.MEDIUM
    progress: float = Field(default=0, ge=0, le=100)


class CustomCategory(_Base):
    name: str = Field(min_length=1, max_length=50)
    budget_limit: float = Field(ge=0, alias="budgetLimit")
    actual_spent: float = Field(default=0, ge=0, alias="actualSpent")


class IncomeSource(_Base):
    name: Optional[str] = None
    source_type: Optional[str] = Field(default=None, alias="sourceType")
    amount: float = Field(ge=0)
    frequency: PayFrequency = PayFrequency.MONTHLY
    description: Optional[str] = None


class FixedExpense(_Base):
    category: str
    amount: float = Field(ge=0)
    due_date: Optional[datetime] = Field(default=None, alias="dueDate")


class RegularExpense(_Base):
    category: str
    amount: float = Field(ge=0)
    frequency: PayFrequency = PayFrequency.MONTHLY
    essential: bool = True


class BudgetLimit(_Base):
    category: str
    limit: float = Field(ge=0)
    current_spending: float = Field(default=0, ge=0, alias="currentSpending")


# ── Employed ───────────────────────────────────────────────────────────────

class BonusDetails(_Base):
    amount: float = Field(ge=0)
    frequency: Optional[str] = None
    last_received: Optional[datetime] = Field(default=None, alias="lastReceived")


class InvestmentPreferences(_Base):
    risk_tolerance: RiskTolerance = Field(default=RiskTolerance.MEDIUM, alias="riskTolerance")
    interested_in: List[str] = Field(default_factory=list, alias="interestedIn")
    experience_level: ExperienceLevel = Field(
        default=ExperienceLevel.BEGINNER, alias="experienceLevel"
    )


# ── Unemployed ─────────────────────────────────────────────────────────────

class LastJobDetails(_Base):
    industry: Optional[str] = None
    position: Optional[str] = None
    duration: Optional[str] = None


class DebtInfo(_Base):
    amount: float = Field(default=0, ge=0)
    monthly_payment: float = Field(default=0, ge=0, alias="monthlyPayment")
    type: Optional[str] = None


class SavingsDetails(_Base):
    amount: float = Field(default=0, ge=0)
    emergency_fund: float = Field(default=0, ge=0, alias="emergencyFund")
    months_covered: float = Field(default=0, ge=0, alias="monthsCovered")


class JobSearchDetails(_Base):
    active: bool = True
    applications_per_week: int = Field(default=0, ge=0, alias="applicationsPerWeek")
    job_search_budget: float = Field(default=0, ge=0, alias="jobSearchBudget")
    industries_targeted: List[str] = Field(default_factory=list, alias="industriesTargeted")
    skills_development: List[str] = Field(default_factory=list, alias="skillsDevelopment")


class SupportResources(_Base):
    wants_budget_help: bool = Field(default=False, alias="wantsBudgetHelp")
    wants_job_resources: bool = Field(default=False, alias="wantsJobResources")
    wants_debt_advice: bool = Field(default=False, alias="wantsDebtAdvice")


# ── Retired ────────────────────────────────────────────────────────────────

class PensionInfo(_Base):
    receives: bool = False
    amount: float = Field(default=0, ge=0)
    frequency: PayFrequency = PayFrequency.MONTHLY


class HousingInfo(_Base):
    mortgage_or_rent: float = Field(default=0, ge=0, alias="mortgageOrRent")
    insurance: float = Field(default=0, ge=0)
    maintenance: float = Field(default=0, ge=0)


class HealthcareInfo(_Base):
    monthly_premium: float = Field(default=0, ge=0, alias="monthlyPremium")
    out_of_pocket: float = Field(default=0, ge=0, alias="outOfPocket")


class OtherExpense(_Base):
    name: str
    amount: float = Field(ge=0)
    frequency: PayFrequency = PayFrequency.MONTHLY


class RetirementAccountWithdrawal(_Base):
    type: str
    monthly_amount: float = Field(ge=0, alias="monthlyAmount")


class RetirementAccount(_Base):
    type: str
    current_value: float = Field(ge=0, alias="currentValue")


class OtherAsset(_Base):
    type: str
    estimated_value: float = Field(ge=0, alias="estimatedValue")


class SavingsGoal(_Base):
    name: str = Field(min_length=1, max_length=100)
    target_amount: float = Field(gt=0, alias="targetAmount")
    current_amount: float = Field(default=0, ge=0, alias="currentAmount")
    category: Optional[str] = None


class Beneficiary(_Base):
    name: str = Field(min_length=1, max_length=100)
    relationship: Optional[str] = None
    percentage: float = Field(ge=0, le=100)


class LegacyPlanning(_Base):
    beneficiaries: List[Beneficiary] = Field(default_factory=list)


# ── Quiz ───────────────────────────────────────────────────────────────────

class QuizAnswer(_Base):
    question: str = Field(min_length=1, max_length=300)
    answer: str = Field(min_length=1, max_length=300)


# ── Guest ──────────────────────────────────────────────────────────────────

class GuestFinancialGoal(_Base):
    name: str
    target_amount: float = Field(gt=0, alias="targetAmount")
    current_amount: float = Field(default=0, ge=0, alias="currentAmount")
    priority: Priority = Priority.MEDIUM
