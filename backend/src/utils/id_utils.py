from beanie import PydanticObjectId
from fastapi import HTTPException


def parse_object_id(raw: str, label: str = "ID") -> PydanticObjectId:
    """Coerce a string path-param into a PydanticObjectId or raise 400.

    Shared by routers that take an `{id}` segment — keeps the error shape
    consistent across endpoints.
    """
    try:
        return PydanticObjectId(raw)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid {label}")
