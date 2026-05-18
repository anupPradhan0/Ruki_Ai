from fastapi import APIRouter, Depends, Response
from src.config.settings import get_settings
from src.schemas.auth_schemas import (
    SignupRequest,
    LoginRequest,
    AuthResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    MessageResponse,
    MeResponse,
)
from src.services.auth_service import register_user, login_user, create_guest_session
from src.services.password_service import (
    request_password_reset,
    reset_password,
    verify_email as verify_email_token,
    issue_email_verification,
    change_password,
    logout_all,
)
from src.middleware.auth_middleware import get_current_user
from src.models.user_model import User

router = APIRouter(prefix="/user", tags=["auth"])

_COOKIE_MAX_AGE = 30 * 24 * 60 * 60  # 30 days in seconds
_GUEST_COOKIE_MAX_AGE = 24 * 60 * 60  # 24 hours in seconds

# In production: HTTPS-only (`secure=True`) and `samesite=lax` so cookies survive
# a top-level navigation from rukiai.online to api.rukiai.online (still same-site
# by registrable-domain rule, but `lax` is the safer default for cross-subdomain).
_SETTINGS = get_settings()
_COOKIE_SECURE = _SETTINGS.is_production
_COOKIE_SAMESITE = "lax" if _SETTINGS.is_production else "strict"


def _set_auth_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        max_age=max_age,
        samesite=_COOKIE_SAMESITE,
        secure=_COOKIE_SECURE,
    )


@router.post("/signup", response_model=AuthResponse)
async def signup(data: SignupRequest, response: Response) -> AuthResponse:
    user, token = await register_user(data)
    _set_auth_cookie(response, token, _COOKIE_MAX_AGE)
    return AuthResponse(
        message="Signup successful",
        user_id=str(user.id),
        user_type=user.user_type,
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, response: Response) -> AuthResponse:
    user, token = await login_user(data)
    _set_auth_cookie(response, token, _COOKIE_MAX_AGE)
    return AuthResponse(
        message="Login successful",
        user_id=str(user.id),
        user_type=user.user_type,
    )


@router.get("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie("token")
    return {"message": "Logged out successfully"}


@router.post("/logout-all", response_model=MessageResponse)
async def logout_everywhere(
    response: Response,
    user: User = Depends(get_current_user),
) -> MessageResponse:
    """Invalidate every JWT ever issued to this user, then clear the local cookie."""
    await logout_all(user)
    response.delete_cookie("token")
    return MessageResponse(message="Signed out of all devices")


@router.get("/guest", response_model=AuthResponse)
async def guest_login(response: Response) -> AuthResponse:
    guest, token = await create_guest_session()
    _set_auth_cookie(response, token, _GUEST_COOKIE_MAX_AGE)
    return AuthResponse(
        message="Guest session created",
        user_id=str(guest.id),
        user_type="guest",
    )


@router.get("/me", response_model=MeResponse)
async def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        user_type=user.user_type,
        email_verified=bool(user.email_verified),
    )


# ── Email verification ──────────────────────────────────────────────────────


@router.get("/verify-email", response_model=MessageResponse)
async def verify_email(token: str) -> MessageResponse:
    await verify_email_token(token)
    return MessageResponse(message="Email verified")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(user: User = Depends(get_current_user)) -> MessageResponse:
    if user.email_verified:
        return MessageResponse(message="Email already verified")
    await issue_email_verification(user)
    return MessageResponse(message="Verification email sent")


# ── Password reset / change ─────────────────────────────────────────────────


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(data: ForgotPasswordRequest) -> MessageResponse:
    # Never reveal whether the address exists.
    await request_password_reset(data.email)
    return MessageResponse(message="If an account exists for that email, a reset link is on its way.")


@router.post("/reset-password", response_model=MessageResponse)
async def do_reset_password(data: ResetPasswordRequest, response: Response) -> MessageResponse:
    await reset_password(data.token, data.new_password)
    # Force the user to log in fresh after a reset.
    response.delete_cookie("token")
    return MessageResponse(message="Password reset successful")


@router.post("/change-password", response_model=MessageResponse)
async def do_change_password(
    data: ChangePasswordRequest,
    response: Response,
    user: User = Depends(get_current_user),
) -> MessageResponse:
    await change_password(user, data.current_password, data.new_password)
    # Old cookie now carries an outdated tv. Drop it so the next request prompts a re-login.
    response.delete_cookie("token")
    return MessageResponse(message="Password changed")
