from typing import Optional
from beanie import PydanticObjectId
from src.models.user_model import User


async def find_user_by_email(email: str) -> Optional[User]:
    return await User.find_one(User.email == email)


async def find_user_by_id(user_id: PydanticObjectId) -> Optional[User]:
    return await User.get(user_id)


async def create_user(
    email: str,
    hashed_password: str,
    full_name: Optional[str] = None,
    phone_number: Optional[str] = None,
    currency: str = "INR",
    user_type: Optional[str] = None,
) -> User:
    user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        phone_number=phone_number,
        currency=currency,
        user_type=user_type,
    )
    await user.insert()
    return user


async def update_user_type(user_id: PydanticObjectId, user_type: str) -> Optional[User]:
    user = await User.get(user_id)
    if user:
        user.user_type = user_type
        await user.save()
    return user
