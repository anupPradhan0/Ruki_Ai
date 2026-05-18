from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from src.config.settings import get_settings


def create_token(
    user_id: str,
    expire_hours: Optional[int] = None,
    token_version: int = 0,
) -> str:
    settings = get_settings()
    expire_days = expire_hours / 24 if expire_hours else settings.JWT_EXPIRE_DAYS
    expire = datetime.utcnow() + timedelta(days=expire_days)
    payload = {"sub": user_id, "exp": expire, "tv": token_version}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def verify_token(token: str) -> Optional[dict]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        return None
