import time
from fastapi import HTTPException
from src.schemas.auth_schemas import SignupRequest, LoginRequest
from src.repositories.user_repository import find_user_by_email, create_user
from src.repositories.guest_repository import create_guest
from src.models.user_model import User
from src.models.guest_model import Guest
from src.utils.password_utils import hash_password, verify_password
from src.utils.jwt_utils import create_token


async def register_user(data: SignupRequest) -> tuple[User, str]:
    """Hash password, persist new User, send verification email, return (user, jwt_token)."""
    existing = await find_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(data.password)
    user = await create_user(
        email=data.email,
        hashed_password=hashed,
        full_name=data.full_name,
        phone_number=data.phone_number,
        currency=data.currency,
        user_type=data.user_type,
    )

    # Fire-and-forget verification email. Import locally to avoid a cycle.
    try:
        from src.services.password_service import issue_email_verification
        await issue_email_verification(user)
    except Exception as exc:
        print(f"Could not send verification email: {exc}")

    token = create_token(str(user.id), token_version=user.token_version)
    return user, token


async def login_user(data: LoginRequest) -> tuple[User, str]:
    """Verify credentials and return (user, jwt_token)."""
    user = await find_user_by_email(data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(str(user.id), token_version=user.token_version)
    return user, token


async def create_guest_session() -> tuple[Guest, str]:
    """Create an anonymous Guest document and return (guest, jwt_token) valid for 24 hours."""
    random_email = f"guest{int(time.time())}@user.com"
    hashed = hash_password("guestpassword")
    guest = await create_guest(email=random_email, hashed_password=hashed)
    # 24-hour token for guest
    token = create_token(str(guest.id), expire_hours=24)
    return guest, token
