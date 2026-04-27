from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class RetiredFormRequest(BaseModel):
    user_id: str
    pension: Optional[Any] = None
    other_income_sources: List[Any] = []
    retirement_account_withdrawals: List[Any] = []
    housing: Optional[Any] = None
    healthcare: Optional[Any] = None
    other_expenses: List[Any] = []
    retirement_accounts: List[Any] = []
    other_assets: List[Any] = []
    savings_goals: List[Any] = []
    legacy_planning: Optional[Any] = None


class RetiredDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    pension: Optional[Any] = None
    savings_goals: List[Any] = []
    ai_advice: Optional[str] = None
