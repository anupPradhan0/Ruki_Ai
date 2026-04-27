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


class RetiredDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    pension: Optional[PensionInfo] = None
    savings_goals: List[SavingsGoal] = []
    ai_advice: Optional[str] = None
