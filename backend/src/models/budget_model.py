from datetime import datetime
from beanie import Document, PydanticObjectId, before_event, Replace, SaveChanges, Update
from pydantic import Field
from pymongo import IndexModel, ASCENDING

from src.models.enums import Currency


class Budget(Document):
    user_id: PydanticObjectId
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")  # "YYYY-MM"
    limits: dict[str, float] = Field(default_factory=dict)  # {category: limit}
    currency: Currency = Currency.INR
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @before_event(Replace, SaveChanges, Update)
    async def _touch_updated_at(self) -> None:
        self.updated_at = datetime.utcnow()

    class Settings:
        name = "budgets"
        validate_on_save = True
        indexes = [
            IndexModel(
                [("user_id", ASCENDING), ("month", ASCENDING)],
                name="user_month_unique_idx",
                unique=True,
            ),
        ]
