from datetime import datetime
from typing import Optional, List, Any
from beanie import PydanticObjectId
from src.models.student_model import StudentData


async def find_student_by_user_id(user_id: PydanticObjectId) -> Optional[StudentData]:
    return await StudentData.find_one(StudentData.user_id == user_id)


async def create_student_data(
    user_id: PydanticObjectId,
    education_level: str,
    living_situation: str,
    is_parent_funded: str,
    institution_name: Optional[str] = None,
    monthly_allowance: Optional[float] = None,
    custom_categories: Optional[List[Any]] = None,
    financial_goals: Optional[List[Any]] = None,
    summary_frequency: str = "daily",
) -> StudentData:
    student = StudentData(
        user_id=user_id,
        education_level=education_level,
        institution_name=institution_name,
        living_situation=living_situation,
        monthly_allowance=monthly_allowance,
        is_parent_funded=is_parent_funded,
        custom_categories=custom_categories or [],
        financial_goals=financial_goals or [],
        summary_frequency=summary_frequency,
    )
    await student.insert()
    return student


async def update_student_ai_advice(student_id: PydanticObjectId, advice: str) -> None:
    student = await StudentData.get(student_id)
    if student:
        student.ai_advice = advice
        student.ai_advice_generated_at = datetime.utcnow()
        await student.save()


async def append_student_goals_and_categories(
    user_id: PydanticObjectId,
    new_goals: List[Any],
    new_categories: List[Any],
) -> Optional[StudentData]:
    student = await find_student_by_user_id(user_id)
    if student:
        student.financial_goals.extend(new_goals)
        student.custom_categories.extend(new_categories)
        student.updated_at = datetime.utcnow()
        await student.save()
    return student
