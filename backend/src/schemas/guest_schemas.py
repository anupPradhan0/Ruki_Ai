from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from src.models.enums import GuestStatus, GuestSummaryFrequency, HelpPreference
from src.models.sub_documents import GuestFinancialGoal


class GuestFormRequest(BaseModel):
    user_id: str
    current_status: GuestStatus
    monthly_income: Optional[float] = Field(default=None, ge=0)
    financial_goal: List[GuestFinancialGoal] = []
    summary_frequency: GuestSummaryFrequency = GuestSummaryFrequency.NEVER
    help_preferences: List[HelpPreference] = []

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )


class GuestDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: Optional[str] = None
    current_status: GuestStatus
    monthly_income: Optional[float] = None
    financial_goal: List[GuestFinancialGoal] = []
    help_preferences: List[HelpPreference] = []
