from typing import Optional
from fastapi import Cookie, HTTPException
from beanie import PydanticObjectId
from src.models.user_model import User
from src.models.guest_model import Guest
from src.utils.jwt_utils import verify_token


async def get_current_user(token: Optional[str] = Cookie(default=None)) -> User:
    """FastAPI dependency — validates JWT cookie and returns the authenticated User."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        user_id = PydanticObjectId(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_current_guest(token: Optional[str] = Cookie(default=None)) -> Guest:
    """FastAPI dependency for guest-only routes — validates JWT and returns Guest."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        guest_id = PydanticObjectId(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    guest = await Guest.get(guest_id)
    if not guest:
        raise HTTPException(status_code=401, detail="Guest session not found")

    return guest
