from datetime import datetime, timedelta
from fastapi import HTTPException
from beanie import PydanticObjectId

from src.schemas.student_schemas import (
    StudentFormRequest,
    StudentDashboardResponse,
    StudentProfileSummary,
)
from src.schemas.common_schemas import MessageResponse, UserSummary
from src.repositories.student_repository import (
    find_student_by_user_id,
    create_student_data,
    update_student_ai_advice,
    append_student_goals_and_categories,
)
from src.repositories.user_repository import find_user_by_id, update_user_type
from src.utils.gemma_utils import get_ai_advice
from src.models.enums import UserType

_STALE_DAYS = 7


async def process_student_form(data: StudentFormRequest) -> MessageResponse:
    """Save a student profile and update the user's type. Returns a typed message."""
    try:
        user_id = PydanticObjectId(data.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await create_student_data(
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
    await update_user_type(user_id, UserType.STUDENT.value)
    return MessageResponse(message="Student profile saved", user_type=UserType.STUDENT)


async def update_student_profile(data: StudentFormRequest) -> MessageResponse:
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

    return MessageResponse(message="Student profile updated")


async def get_student_dashboard(user_id: PydanticObjectId) -> StudentDashboardResponse:
    """Return the typed student dashboard, refreshing AI advice if stale (>7 days)."""
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    student = await find_student_by_user_id(user_id)
    if not student:
        return StudentDashboardResponse(needs_onboarding=True, user=UserSummary.model_validate(user))

    stale = (
        student.ai_advice is None
        or student.ai_advice_generated_at is None
        or (datetime.utcnow() - student.ai_advice_generated_at) > timedelta(days=_STALE_DAYS)
    )

    if stale:
        advice = await get_ai_advice(student, "student")
        await update_student_ai_advice(student.id, advice)
        student.ai_advice = advice

    return StudentDashboardResponse(
        user=UserSummary.model_validate(user),
        student=StudentProfileSummary.model_validate(student),
        ai_advice=student.ai_advice,
        quiz_completed=bool(getattr(student, "quiz_responses", None)),
    )
