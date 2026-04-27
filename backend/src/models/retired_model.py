from datetime import datetime
from typing import Optional, List
from beanie import Document, PydanticObjectId, before_event, Replace, SaveChanges, Update
from pydantic import Field, ConfigDict, model_validator
from pymongo import IndexModel, ASCENDING

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


class RetiredData(Document):
    user_id: PydanticObjectId
    pension: Optional[PensionInfo] = None
    other_income_sources: List[IncomeSource] = Field(default_factory=list)
    retirement_account_withdrawals: List[RetirementAccountWithdrawal] = Field(default_factory=list)
    housing: Optional[HousingInfo] = None
    healthcare: Optional[HealthcareInfo] = None
    other_expenses: List[OtherExpense] = Field(default_factory=list)
    retirement_accounts: List[RetirementAccount] = Field(default_factory=list)
    other_assets: List[OtherAsset] = Field(default_factory=list)
    savings_goals: List[SavingsGoal] = Field(default_factory=list)
    legacy_planning: Optional[LegacyPlanning] = None
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
    def _validate_beneficiary_total(self) -> "RetiredData":
        if self.legacy_planning and self.legacy_planning.beneficiaries:
            total = sum(b.percentage for b in self.legacy_planning.beneficiaries)
            if total > 100:
                raise ValueError(
                    f"Beneficiary percentages total {total}%, must not exceed 100%"
                )
        return self

    @before_event(Replace, SaveChanges, Update)
    async def _touch_updated_at(self) -> None:
        self.updated_at = datetime.utcnow()

    class Settings:
        name = "retired_data"
        validate_on_save = True
        use_state_management = True
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True, name="user_id_unique"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
        ]
