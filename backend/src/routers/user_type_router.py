from fastapi import APIRouter, Depends
from src.schemas.student_schemas import StudentFormRequest
from src.schemas.employed_schemas import EmployedFormRequest
from src.schemas.retired_schemas import RetiredFormRequest
from src.schemas.unemployed_schemas import UnemployedFormRequest
from src.services.student_service import process_student_form, update_student_profile
from src.services.employed_service import process_employed_form
from src.services.retired_service import process_retired_form
from src.services.unemployed_service import process_unemployed_form
from src.middleware.auth_middleware import get_current_user
from src.models.user_model import User

router = APIRouter(prefix="/userType", tags=["user-type"])


@router.post("/student")
async def student_form(
    data: StudentFormRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    return await process_student_form(data)


@router.post("/update-student")
async def update_student_form(
    data: StudentFormRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    return await update_student_profile(data)


@router.post("/employed")
async def employed_form(
    data: EmployedFormRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    return await process_employed_form(data)


@router.post("/unemployed")
async def unemployed_form(
    data: UnemployedFormRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    return await process_unemployed_form(data)


@router.post("/retired")
async def retired_form(
    data: RetiredFormRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    return await process_retired_form(data)
