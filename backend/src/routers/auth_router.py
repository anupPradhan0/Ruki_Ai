from fastapi import APIRouter, Response
from src.config.settings import get_settings
from src.schemas.auth_schemas import SignupRequest, LoginRequest, AuthResponse
from src.services.auth_service import register_user, login_user, create_guest_session

router = APIRouter(prefix="/user", tags=["auth"])

_COOKIE_MAX_AGE = 30 * 24 * 60 * 60  # 30 days in seconds
_GUEST_COOKIE_MAX_AGE = 24 * 60 * 60  # 24 hours in seconds

# In production: HTTPS-only (`secure=True`) and `samesite=lax` so cookies survive
# a top-level navigation from rukiai.online to api.rukiai.online (still same-site
# by registrable-domain rule, but `lax` is the safer default for cross-subdomain).
_SETTINGS = get_settings()
_COOKIE_SECURE = _SETTINGS.is_production
_COOKIE_SAMESITE = "lax" if _SETTINGS.is_production else "strict"


@router.post("/signup", response_model=AuthResponse)
async def signup(data: SignupRequest, response: Response) -> AuthResponse:
    user, token = await register_user(data)
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        max_age=_COOKIE_MAX_AGE,
        samesite=_COOKIE_SAMESITE,
        secure=_COOKIE_SECURE,
    )
    return AuthResponse(
        message="Signup successful",
        user_id=str(user.id),
        user_type=user.user_type,
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, response: Response) -> AuthResponse:
    user, token = await login_user(data)
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        max_age=_COOKIE_MAX_AGE,
        samesite=_COOKIE_SAMESITE,
        secure=_COOKIE_SECURE,
    )
    return AuthResponse(
        message="Login successful",
        user_id=str(user.id),
        user_type=user.user_type,
    )


@router.get("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie("token")
    return {"message": "Logged out successfully"}


@router.get("/guest", response_model=AuthResponse)
async def guest_login(response: Response) -> AuthResponse:
    guest, token = await create_guest_session()
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        max_age=_GUEST_COOKIE_MAX_AGE,
        samesite=_COOKIE_SAMESITE,
        secure=_COOKIE_SECURE,
    )
    return AuthResponse(
        message="Guest session created",
        user_id=str(guest.id),
        user_type="guest",
    )
