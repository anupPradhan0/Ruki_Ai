from fastapi import APIRouter, Depends

from src.schemas.guest_schemas import GuestFormRequest, GuestDashboardResponse
from src.schemas.student_schemas import StudentDashboardResponse
from src.schemas.employed_schemas import EmployedDashboardResponse
from src.schemas.unemployed_schemas import UnemployedDashboardResponse
from src.schemas.retired_schemas import RetiredDashboardResponse
from src.services.student_service import get_student_dashboard, regenerate_student_advice
from src.services.employed_service import get_employed_dashboard, regenerate_employed_advice
from src.services.retired_service import get_retired_dashboard, regenerate_retired_advice
from src.services.unemployed_service import get_unemployed_dashboard, regenerate_unemployed_advice
from src.services.guest_service import get_or_create_guest_dashboard
from src.middleware.auth_middleware import get_current_user
from src.models.user_model import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/student", response_model=StudentDashboardResponse)
async def student_dashboard(
    current_user: User = Depends(get_current_user),
) -> StudentDashboardResponse:
    return await get_student_dashboard(current_user.id)


@router.get("/employed", response_model=EmployedDashboardResponse)
async def employed_dashboard(
    current_user: User = Depends(get_current_user),
) -> EmployedDashboardResponse:
    return await get_employed_dashboard(current_user.id)


@router.get("/unemployed", response_model=UnemployedDashboardResponse)
async def unemployed_dashboard(
    current_user: User = Depends(get_current_user),
) -> UnemployedDashboardResponse:
    return await get_unemployed_dashboard(current_user.id)


@router.get("/retired", response_model=RetiredDashboardResponse)
async def retired_dashboard(
    current_user: User = Depends(get_current_user),
) -> RetiredDashboardResponse:
    return await get_retired_dashboard(current_user.id)


@router.post("/guest", response_model=GuestDashboardResponse)
async def guest_dashboard(data: GuestFormRequest) -> GuestDashboardResponse:
    return await get_or_create_guest_dashboard(data)


@router.post("/student/regenerate-advice", response_model=StudentDashboardResponse)
async def regenerate_student_advice_endpoint(
    current_user: User = Depends(get_current_user),
) -> StudentDashboardResponse:
    return await regenerate_student_advice(current_user.id)


@router.post("/employed/regenerate-advice", response_model=EmployedDashboardResponse)
async def regenerate_employed_advice_endpoint(
    current_user: User = Depends(get_current_user),
) -> EmployedDashboardResponse:
    return await regenerate_employed_advice(current_user.id)


@router.post("/unemployed/regenerate-advice", response_model=UnemployedDashboardResponse)
async def regenerate_unemployed_advice_endpoint(
    current_user: User = Depends(get_current_user),
) -> UnemployedDashboardResponse:
    return await regenerate_unemployed_advice(current_user.id)


@router.post("/retired/regenerate-advice", response_model=RetiredDashboardResponse)
async def regenerate_retired_advice_endpoint(
    current_user: User = Depends(get_current_user),
) -> RetiredDashboardResponse:
    return await regenerate_retired_advice(current_user.id)
