from datetime import datetime, timedelta
from fastapi import HTTPException
from beanie import PydanticObjectId
from src.schemas.student_schemas import StudentFormRequest
from src.repositories.student_repository import (
    find_student_by_user_id,
    create_student_data,
    update_student_ai_advice,
    append_student_goals_and_categories,
)
from src.repositories.user_repository import find_user_by_id, update_user_type
from src.utils.cohere_utils import get_ai_advice

_STALE_DAYS = 7


async def process_student_form(data: StudentFormRequest) -> dict:
    """Save student profile, update user_type to 'student', return saved data."""
    try:
        user_id = PydanticObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    student = await create_student_data(
        user_id=user_id,
        education_level=data.education_level,
        institution_name=data.institution_name,
        living_situation=data.living_situation,
        monthly_allowance=data.monthly_allowance,
        is_parent_funded=data.is_parent_funded,
        custom_categories=data.custom_categories,
        financial_goals=data.financial_goals,
        summary_frequency=data.summary_frequency,
    )
    await update_user_type(user_id, "student")
    return {"message": "Student profile saved", "user_type": "student"}


async def update_student_profile(data: StudentFormRequest) -> dict:
    """Append new goals and categories to an existing student profile."""
    try:
        user_id = PydanticObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    student = await append_student_goals_and_categories(
        user_id=user_id,
        new_goals=data.financial_goals,
        new_categories=data.custom_categories,
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    return {"message": "Student profile updated"}


async def get_student_dashboard(user_id: PydanticObjectId) -> dict:
    """Return student dashboard data, refreshing AI advice if stale (>7 days)."""
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    student = await find_student_by_user_id(user_id)
    if not student:
        return {"needs_onboarding": True}

    stale = (
        student.ai_advice is None
        or student.ai_advice_generated_at is None
        or (datetime.utcnow() - student.ai_advice_generated_at) > timedelta(days=_STALE_DAYS)
    )

    if stale:
        advice = await get_ai_advice(student, "student")
        await update_student_ai_advice(student.id, advice)
        student.ai_advice = advice

    return {
        "user": {"email": user.email, "full_name": user.full_name, "currency": user.currency},
        "student": student.model_dump(),
        "ai_advice": student.ai_advice,
    }
