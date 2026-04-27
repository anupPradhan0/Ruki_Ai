from typing import Optional
from pydantic import BaseModel, Field


class ProviderInfo(BaseModel):
    id: str
    label: str
    models: list[str]
    needs_api_key: bool


class ProvidersResponse(BaseModel):
    providers: list[ProviderInfo]


class AiSettingsResponse(BaseModel):
    provider: str
    model: str
    has_api_key: bool


class AiSettingsUpdateRequest(BaseModel):
    provider: str = Field(min_length=1)
    model: str = Field(min_length=1)
    api_key: Optional[str] = None
