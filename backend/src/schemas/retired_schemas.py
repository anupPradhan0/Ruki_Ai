from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from src.models.sub_documents import (
    PensionInfo,
    IncomeSource,
    RetirementAccountWithdrawal,
    HousingInfo,
    HealthcareInfo,
    OtherExpense,
    RetirementAccount,
    OtherAsset,
    SavingsGoal,
    LegacyPlanning,
)
from src.schemas.common_schemas import UserSummary


class RetiredFormRequest(BaseModel):
    user_id: str
    pension: Optional[PensionInfo] = None
    other_income_sources: List[IncomeSource] = []
    retirement_account_withdrawals: List[RetirementAccountWithdrawal] = []
    housing: Optional[HousingInfo] = None
    healthcare: Optional[HealthcareInfo] = None
    other_expenses: List[OtherExpense] = []
    retirement_accounts: List[RetirementAccount] = []
    other_assets: List[OtherAsset] = []
    savings_goals: List[SavingsGoal] = []
    legacy_planning: Optional[LegacyPlanning] = None

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )


class RetiredProfileSummary(BaseModel):
    pension: Optional[PensionInfo] = None
    other_income_sources: List[IncomeSource] = []
    retirement_account_withdrawals: List[RetirementAccountWithdrawal] = []
    housing: Optional[HousingInfo] = None
    healthcare: Optional[HealthcareInfo] = None
    other_expenses: List[OtherExpense] = []
    retirement_accounts: List[RetirementAccount] = []
    other_assets: List[OtherAsset] = []
    savings_goals: List[SavingsGoal] = []
    legacy_planning: Optional[LegacyPlanning] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class RetiredDashboardResponse(BaseModel):
    needs_onboarding: bool = False
    quiz_completed: bool = False
    user: Optional[UserSummary] = None
    retired: Optional[RetiredProfileSummary] = None
    ai_advice: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
