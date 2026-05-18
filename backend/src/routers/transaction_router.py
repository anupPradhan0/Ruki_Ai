from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status

from src.middleware.auth_middleware import get_current_user
from src.models.user_model import User
from src.schemas.transaction_schemas import (
    StatsResponse,
    TransactionCreate,
    TransactionListResponse,
    TransactionOut,
    TransactionUpdate,
)
from src.services import transaction_service
from src.utils.id_utils import parse_object_id


router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate, current_user: User = Depends(get_current_user)
) -> TransactionOut:
    return await transaction_service.create_transaction(current_user, data)


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    start: Optional[datetime] = Query(default=None),
    end: Optional[datetime] = Query(default=None),
    category: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
) -> TransactionListResponse:
    return await transaction_service.list_transactions(
        current_user, start=start, end=end, category=category, type_=type, limit=limit, skip=skip
    )


@router.get("/stats/{month}", response_model=StatsResponse)
async def get_stats(month: str, current_user: User = Depends(get_current_user)) -> StatsResponse:
    return await transaction_service.get_month_stats(current_user, month)


@router.get("/{txn_id}", response_model=TransactionOut)
async def get_transaction(
    txn_id: str, current_user: User = Depends(get_current_user)
) -> TransactionOut:
    return await transaction_service.get_transaction(parse_object_id(txn_id, "transaction ID"), current_user)


@router.patch("/{txn_id}", response_model=TransactionOut)
async def update_transaction(
    txn_id: str,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
) -> TransactionOut:
    return await transaction_service.update_transaction(parse_object_id(txn_id, "transaction ID"), current_user, data)


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    txn_id: str, current_user: User = Depends(get_current_user)
) -> Response:
    await transaction_service.delete_transaction(parse_object_id(txn_id, "transaction ID"), current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
