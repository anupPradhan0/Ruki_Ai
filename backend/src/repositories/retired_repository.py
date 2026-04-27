from datetime import datetime
from typing import Optional, Any
from beanie import PydanticObjectId
from src.models.retired_model import RetiredData


async def find_retired_by_user_id(user_id: PydanticObjectId) -> Optional[RetiredData]:
    return await RetiredData.find_one(RetiredData.user_id == user_id)


async def create_retired_data(user_id: PydanticObjectId, **kwargs: Any) -> RetiredData:
    retired = RetiredData(user_id=user_id, **kwargs)
    await retired.insert()
    return retired


async def update_retired_ai_advice(retired_id: PydanticObjectId, advice: str) -> None:
    retired = await RetiredData.get(retired_id)
    if retired:
        retired.ai_advice = advice
        retired.ai_advice_generated_at = datetime.utcnow()
        await retired.save()
