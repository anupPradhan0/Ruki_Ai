from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import Category, Currency, TxnType


_MONTH_RE = r"^\d{4}-(0[1-9]|1[0-2])$"


class TransactionCreate(BaseModel):
    amount: float = Field(gt=0)
    type: TxnType
    category: Category
    merchant: str = Field(default="", max_length=120)
    note: str = Field(default="", max_length=500)
    occurred_at: datetime

    model_config = ConfigDict(str_strip_whitespace=True, use_enum_values=True)


class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    type: Optional[TxnType] = None
    category: Optional[Category] = None
    merchant: Optional[str] = Field(default=None, max_length=120)
    note: Optional[str] = Field(default=None, max_length=500)
    occurred_at: Optional[datetime] = None

    model_config = ConfigDict(str_strip_whitespace=True, use_enum_values=True)


class TransactionOut(BaseModel):
    id: str
    amount: float
    type: TxnType
    category: Category
    merchant: str
    note: str
    occurred_at: datetime
    currency: Currency

    model_config = ConfigDict(use_enum_values=True)


class TransactionListResponse(BaseModel):
    items: List[TransactionOut]
    total_count: int


class DailyPoint(BaseModel):
    date: str  # "YYYY-MM-DD"
    expense: float
    income: float


class StatsResponse(BaseModel):
    month: str
    by_category: dict[str, float]
    daily: List[DailyPoint]
    total_expense: float
    total_income: float
    budget: Optional[dict[str, float]] = None
    budget_used_pct: Optional[dict[str, float]] = None


class BudgetUpsert(BaseModel):
    month: str = Field(pattern=_MONTH_RE)
    limits: dict[Category, float]

    model_config = ConfigDict(use_enum_values=True)


class BudgetOut(BaseModel):
    month: str
    limits: dict[str, float]
    currency: Currency

    model_config = ConfigDict(use_enum_values=True)
