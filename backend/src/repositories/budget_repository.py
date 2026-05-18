from typing import Optional

from beanie import PydanticObjectId

from src.models.budget_model import Budget


async def get(user_id: PydanticObjectId, month: str) -> Optional[Budget]:
    return await Budget.find_one(Budget.user_id == user_id, Budget.month == month)


async def upsert(user_id: PydanticObjectId, month: str, limits: dict[str, float]) -> Budget:
    existing = await get(user_id, month)
    if existing:
        existing.limits = limits
        await existing.save()
        return existing
    doc = Budget(user_id=user_id, month=month, limits=limits)
    await doc.insert()
    return doc
