from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId

from src.models.transaction_model import Transaction


async def create(txn: Transaction) -> Transaction:
    await txn.insert()
    return txn


async def get(txn_id: PydanticObjectId, user_id: PydanticObjectId) -> Optional[Transaction]:
    doc = await Transaction.get(txn_id)
    if not doc or doc.user_id != user_id:
        return None
    return doc


async def delete(txn_id: PydanticObjectId, user_id: PydanticObjectId) -> bool:
    doc = await get(txn_id, user_id)
    if not doc:
        return False
    await doc.delete()
    return True


async def list_for_user(
    user_id: PydanticObjectId,
    *,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    category: Optional[str] = None,
    type_: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
) -> tuple[List[Transaction], int]:
    query: dict = {"user_id": user_id}
    if start or end:
        rng: dict = {}
        if start:
            rng["$gte"] = start
        if end:
            rng["$lt"] = end
        query["occurred_at"] = rng
    if category:
        query["category"] = category
    if type_:
        query["type"] = type_

    cursor = Transaction.find(query).sort("-occurred_at").skip(skip).limit(limit)
    items = await cursor.to_list()
    total = await Transaction.find(query).count()
    return items, total


async def aggregate_month(user_id: PydanticObjectId, start: datetime, end: datetime) -> dict:
    """Single $facet pipeline → by_category totals + daily series + grand totals."""
    pipeline = [
        {"$match": {"user_id": user_id, "occurred_at": {"$gte": start, "$lt": end}}},
        {
            "$facet": {
                "by_category": [
                    {"$match": {"type": "expense"}},
                    {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
                ],
                "daily": [
                    {
                        "$group": {
                            "_id": {
                                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$occurred_at"}},
                                "type": "$type",
                            },
                            "total": {"$sum": "$amount"},
                        }
                    }
                ],
                "totals": [
                    {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}},
                ],
            }
        },
    ]
    res = await Transaction.aggregate(pipeline).to_list()
    return res[0] if res else {"by_category": [], "daily": [], "totals": []}
