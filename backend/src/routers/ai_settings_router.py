from fastapi import APIRouter, Depends

from src.middleware.auth_middleware import get_current_user
from src.models.user_model import User
from src.schemas.ai_settings_schemas import (
    AiSettingsResponse,
    AiSettingsUpdateRequest,
    ProvidersResponse,
)
from src.services.ai_settings_service import (
    get_user_settings,
    list_providers,
    update_user_settings,
)

router = APIRouter(prefix="/ai-settings", tags=["ai-settings"])


@router.get("/providers", response_model=ProvidersResponse)
async def get_providers() -> ProvidersResponse:
    return list_providers()


@router.get("", response_model=AiSettingsResponse)
async def get_settings(user: User = Depends(get_current_user)) -> AiSettingsResponse:
    return get_user_settings(user)


@router.post("", response_model=AiSettingsResponse)
async def update_settings(
    data: AiSettingsUpdateRequest,
    user: User = Depends(get_current_user),
) -> AiSettingsResponse:
    return await update_user_settings(user, data)
