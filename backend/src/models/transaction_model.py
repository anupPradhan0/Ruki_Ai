from datetime import datetime
from beanie import Document, PydanticObjectId, before_event, Replace, SaveChanges, Update
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING

from src.models.enums import Category, Currency, TxnType


class Transaction(Document):
    user_id: PydanticObjectId
    amount: float = Field(gt=0)
    type: TxnType
    category: Category
    merchant: str = Field(default="", max_length=120)
    note: str = Field(default="", max_length=500)
    occurred_at: datetime
    currency: Currency = Currency.INR
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @before_event(Replace, SaveChanges, Update)
    async def _touch_updated_at(self) -> None:
        self.updated_at = datetime.utcnow()

    class Settings:
        name = "transactions"
        validate_on_save = True
        indexes = [
            IndexModel([("user_id", ASCENDING), ("occurred_at", DESCENDING)], name="user_recent_txn_idx"),
            IndexModel([("user_id", ASCENDING), ("category", ASCENDING)], name="user_category_idx"),
        ]
