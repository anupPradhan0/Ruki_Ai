from datetime import datetime
from typing import Optional, Any
from beanie import PydanticObjectId
from src.models.unemployed_model import UnemployedData


async def find_unemployed_by_user_id(user_id: PydanticObjectId) -> Optional[UnemployedData]:
    return await UnemployedData.find_one(UnemployedData.user_id == user_id)


async def create_unemployed_data(user_id: PydanticObjectId, **kwargs: Any) -> UnemployedData:
    unemployed = UnemployedData(user_id=user_id, **kwargs)
    await unemployed.insert()
    return unemployed


async def update_unemployed_ai_advice(unemployed_id: PydanticObjectId, advice: str) -> None:
    unemployed = await UnemployedData.get(unemployed_id)
    if unemployed:
        unemployed.ai_advice = advice
        unemployed.ai_advice_generated_at = datetime.utcnow()
        await unemployed.save()
