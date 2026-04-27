from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class GuestFormRequest(BaseModel):
    user_id: str
    current_status: str
    monthly_income: Optional[float] = None
    financial_goal: List[Any] = []
    summary_frequency: str = "never"
    help_preferences: List[str] = []


class GuestDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: Optional[str] = None
    current_status: str
    monthly_income: Optional[float] = None
    financial_goal: List[Any] = []
    help_preferences: List[str] = []
