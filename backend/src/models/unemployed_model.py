from datetime import datetime
from typing import Optional, List, Any
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class UnemployedData(Document):
    user_id: PydanticObjectId
    employment_status: Optional[str] = None  # actively-seeking | taking-break | studying | caring | disabled
    last_job_details: Optional[Any] = None
    current_income: Optional[float] = None
    income_sources: List[Any] = Field(default_factory=list)
    debt: Optional[Any] = None
    comfort_budget: Optional[float] = None
    runway_estimate: Optional[float] = None
    living_situation: Optional[str] = None  # alone | with-family | with-roommates
    has_dependents: bool = False
    dependents_count: int = 0
    gig_interest: Optional[str] = None  # not-at-all | somewhat | very-open
    has_tools: bool = True
    willing_to_relocate: bool = False
    goal_priority: Optional[str] = None
    savings_details: Optional[Any] = None
    regular_expenses: List[Any] = Field(default_factory=list)
    budget_limits: List[Any] = Field(default_factory=list)
    financial_goals: List[Any] = Field(default_factory=list)
    job_search_details: Optional[Any] = None
    summary_frequency: Optional[str] = None
    support_resources: Optional[Any] = None
    ai_advice: Optional[str] = None
    ai_advice_generated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "unemployed_data"
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True),
        ]
