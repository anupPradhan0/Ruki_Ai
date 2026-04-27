from datetime import datetime
from typing import Optional, List, Any
from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class EmployedData(Document):
    user_id: PydanticObjectId
    job_title: Optional[str] = None
    employment_type: Optional[str] = None  # full-time | part-time | contract | self-employed | freelance
    company: Optional[str] = None
    work_industry: Optional[str] = None
    work_location: Optional[str] = None
    monthly_salary: Optional[float] = None
    pay_frequency: str = "monthly"  # weekly | bi-weekly | monthly | semi-monthly | annually
    additional_income_sources: List[Any] = Field(default_factory=list)
    has_bonuses: bool = False
    bonus_details: Optional[Any] = None
    fixed_expenses: List[Any] = Field(default_factory=list)
    budget_limits: List[Any] = Field(default_factory=list)
    financial_goals: List[Any] = Field(default_factory=list)
    summary_frequency: Optional[str] = None  # daily | weekly | bi-weekly | monthly
    investment_preferences: Optional[Any] = None
    ai_advice: Optional[str] = None
    ai_advice_generated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "employed_data"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("work_industry", ASCENDING)]),
            IndexModel([("employment_type", ASCENDING)]),
        ]
