from datetime import datetime
from typing import Optional
from beanie import Document, PydanticObjectId
from pydantic import Field, ConfigDict
from pymongo import IndexModel, ASCENDING


# Stored hashed; raw token only exists in the email link.
class VerificationToken(Document):
    user_id: PydanticObjectId
    token_hash: str
    purpose: str  # "email_verify" | "password_reset"
    expires_at: datetime
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, str_strip_whitespace=True)

    class Settings:
        name = "verification_tokens"
        validate_on_save = True
        indexes = [
            IndexModel([("token_hash", ASCENDING)], unique=True, name="token_hash_unique"),
            IndexModel([("user_id", ASCENDING), ("purpose", ASCENDING)], name="user_purpose_idx"),
            # TTL: Mongo deletes the doc the moment expires_at passes.
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0, name="expires_at_ttl"),
        ]
