from datetime import datetime
from typing import Optional, List
from beanie import Document, PydanticObjectId
from pydantic import Field, ConfigDict
from pymongo import IndexModel, ASCENDING

from src.models.enums import GuestStatus, GuestSummaryFrequency, HelpPreference
from src.models.sub_documents import GuestFinancialGoal


class GuestUser(Document):
    """Profile data submitted by a guest from the onboarding form."""

    user_id: Optional[PydanticObjectId] = None
    current_status: GuestStatus
    monthly_income: Optional[float] = Field(default=None, ge=0)
    financial_goal: List[GuestFinancialGoal] = Field(default_factory=list)
    summary_frequency: GuestSummaryFrequency = GuestSummaryFrequency.NEVER
    help_preferences: List[HelpPreference] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )

    class Settings:
        name = "guest_users"
        validate_on_save = True
        use_state_management = True
        indexes = [
            IndexModel([("user_id", ASCENDING)], unique=True, name="user_id_unique"),
            IndexModel([("current_status", ASCENDING)], name="current_status_idx"),
            IndexModel(
                [("created_at", ASCENDING)],
                expireAfterSeconds=60 * 60 * 24 * 7,  # auto-purge after 7 days
                name="ttl_created_at",
            ),
        ]
