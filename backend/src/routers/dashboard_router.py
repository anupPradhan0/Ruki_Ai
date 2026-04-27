from fastapi import APIRouter, Depends

from src.schemas.guest_schemas import GuestFormRequest, GuestDashboardResponse
from src.schemas.student_schemas import StudentDashboardResponse
from src.schemas.employed_schemas import EmployedDashboardResponse
from src.schemas.unemployed_schemas import UnemployedDashboardResponse
from src.schemas.retired_schemas import RetiredDashboardResponse
from src.services.student_service import get_student_dashboard
from src.services.employed_service import get_employed_dashboard
from src.services.retired_service import get_retired_dashboard
from src.services.unemployed_service import get_unemployed_dashboard
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
