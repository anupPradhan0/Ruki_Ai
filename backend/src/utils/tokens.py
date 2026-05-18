import hashlib
import secrets


def generate_token() -> tuple[str, str]:
    """Return (raw, sha256_hex). Raw goes in the email link; only the hash is stored."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
