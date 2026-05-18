from datetime import datetime, timedelta
from fastapi import HTTPException

from src.config.settings import get_settings
from src.models.user_model import User
from src.models.verification_token_model import VerificationToken
from src.repositories.user_repository import find_user_by_email
from src.utils.email_utils import send_verification_email, send_password_reset_email
from src.utils.password_utils import hash_password, verify_password
from src.utils.tokens import generate_token, hash_token


PURPOSE_VERIFY = "email_verify"
PURPOSE_RESET = "password_reset"

VERIFY_TTL_HOURS = 24
RESET_TTL_HOURS = 1


def _frontend_base() -> str:
    base = (get_settings().FRONTEND_URL or "").rstrip("/")
    if not base:
        # Dev fallback — must match the Vite dev server.
        base = "http://localhost:5173"
    return base


async def _invalidate_outstanding(user_id, purpose: str) -> None:
    """Delete any unused tokens of the same purpose so old links stop working."""
    await VerificationToken.find(
        VerificationToken.user_id == user_id,
        VerificationToken.purpose == purpose,
        VerificationToken.used_at == None,  # noqa: E711
    ).delete()


async def issue_email_verification(user: User) -> None:
    """Generate a fresh verify token and send the email. Idempotent — old tokens are dropped."""
    if user.email_verified:
        return

    await _invalidate_outstanding(user.id, PURPOSE_VERIFY)

    raw, token_hash = generate_token()
    await VerificationToken(
        user_id=user.id,
        token_hash=token_hash,
        purpose=PURPOSE_VERIFY,
        expires_at=datetime.utcnow() + timedelta(hours=VERIFY_TTL_HOURS),
    ).insert()

    url = f"{_frontend_base()}/verify-email?token={raw}"
    await send_verification_email(user.email, url)


async def verify_email(raw_token: str) -> User:
    record = await VerificationToken.find_one(
        VerificationToken.token_hash == hash_token(raw_token),
        VerificationToken.purpose == PURPOSE_VERIFY,
    )
    if not record or record.used_at is not None:
        raise HTTPException(status_code=400, detail="Invalid or already-used link")
    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification link expired")

    user = await User.get(record.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.email_verified = True
    user.email_verified_at = datetime.utcnow()
    await user.save()

    record.used_at = datetime.utcnow()
    await record.save()

    return user


async def request_password_reset(email: str) -> None:
    """Always succeed silently — never reveal whether the email is registered."""
    user = await find_user_by_email(email)
    if not user:
        return

    await _invalidate_outstanding(user.id, PURPOSE_RESET)

    raw, token_hash = generate_token()
    await VerificationToken(
        user_id=user.id,
        token_hash=token_hash,
        purpose=PURPOSE_RESET,
        expires_at=datetime.utcnow() + timedelta(hours=RESET_TTL_HOURS),
    ).insert()

    url = f"{_frontend_base()}/reset-password?token={raw}"
    await send_password_reset_email(user.email, url)


async def reset_password(raw_token: str, new_password: str) -> User:
    record = await VerificationToken.find_one(
        VerificationToken.token_hash == hash_token(raw_token),
        VerificationToken.purpose == PURPOSE_RESET,
    )
    if not record or record.used_at is not None:
        raise HTTPException(status_code=400, detail="Invalid or already-used link")
    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset link expired")

    user = await User.get(record.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.hashed_password = hash_password(new_password)
    user.password_changed_at = datetime.utcnow()
    # Invalidate every existing session — that's the whole point of a reset.
    user.token_version = (user.token_version or 0) + 1
    await user.save()

    record.used_at = datetime.utcnow()
    await record.save()

    return user


async def change_password(user: User, current_password: str, new_password: str) -> User:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must be different")

    user.hashed_password = hash_password(new_password)
    user.password_changed_at = datetime.utcnow()
    user.token_version = (user.token_version or 0) + 1
    await user.save()
    return user


async def logout_all(user: User) -> User:
    user.token_version = (user.token_version or 0) + 1
    await user.save()
    return user
