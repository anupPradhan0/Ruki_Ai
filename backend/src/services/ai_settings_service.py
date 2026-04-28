from typing import Awaitable, Callable, Optional

from fastapi import HTTPException

from src.models.user_model import User
from src.repositories.employed_repository import find_employed_by_user_id
from src.repositories.retired_repository import find_retired_by_user_id
from src.repositories.student_repository import find_student_by_user_id
from src.repositories.unemployed_repository import find_unemployed_by_user_id
from src.schemas.ai_settings_schemas import (
    AiSettingsResponse,
    AiSettingsUpdateRequest,
    ProviderInfo,
    ProvidersResponse,
)
from src.utils.ai_utils import PROVIDERS

_PROFILE_FINDERS: dict[str, Callable[..., Awaitable[Optional[object]]]] = {
    "student": find_student_by_user_id,
    "employed": find_employed_by_user_id,
    "unemployed": find_unemployed_by_user_id,
    "retired": find_retired_by_user_id,
}


def list_providers() -> ProvidersResponse:
    return ProvidersResponse(
        providers=[
            ProviderInfo(id=pid, label=p["label"], models=p["models"], needs_api_key=p["needs_api_key"])
            for pid, p in PROVIDERS.items()
        ]
    )


def get_user_settings(user: User) -> AiSettingsResponse:
    return AiSettingsResponse(
        provider=user.ai_provider or "local",
        model=user.ai_model or "gemma4:e2b",
        has_api_key=bool(user.ai_api_key),
    )


async def _clear_cached_ai_advice(user: User) -> None:
    """Drop cached AI advice on the user's profile so the next dashboard fetch
    regenerates with the newly-saved provider/key. Without this, the 7-day
    staleness window keeps serving stale advice (often the failure fallback
    from a misconfigured previous provider)."""
    finder = _PROFILE_FINDERS.get(user.user_type or "")
    if not finder:
        return
    profile = await finder(user.id)
    if not profile:
        return
    profile.ai_advice = None
    profile.ai_advice_generated_at = None
    await profile.save()


async def update_user_settings(user: User, data: AiSettingsUpdateRequest) -> AiSettingsResponse:
    provider_def = PROVIDERS.get(data.provider)
    if not provider_def:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {data.provider}")
    if data.model not in provider_def["models"]:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{data.model}' is not available for provider '{data.provider}'",
        )
    if provider_def["needs_api_key"] and not (data.api_key or user.ai_api_key):
        raise HTTPException(status_code=400, detail=f"Provider '{data.provider}' requires an API key")

    user.ai_provider = data.provider
    user.ai_model = data.model
    if data.api_key is not None:
        user.ai_api_key = data.api_key.strip() or None
    if not provider_def["needs_api_key"]:
        user.ai_api_key = None

    await user.save()
    await _clear_cached_ai_advice(user)
    return get_user_settings(user)
