from datetime import datetime
from typing import Optional, List, Any
from beanie import PydanticObjectId
from src.models.employed_model import EmployedData


async def find_employed_by_user_id(user_id: PydanticObjectId) -> Optional[EmployedData]:
    return await EmployedData.find_one(EmployedData.user_id == user_id)


async def create_employed_data(user_id: PydanticObjectId, **kwargs: Any) -> EmployedData:
    employed = EmployedData(user_id=user_id, **kwargs)
    await employed.insert()
    return employed


async def update_employed_ai_advice(employed_id: PydanticObjectId, advice: str) -> None:
    employed = await EmployedData.get(employed_id)
    if employed:
        employed.ai_advice = advice
        employed.ai_advice_generated_at = datetime.utcnow()
        await employed.save()
