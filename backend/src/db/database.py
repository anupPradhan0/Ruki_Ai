from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from src.config.settings import get_settings
from src.models.user_model import User
from src.models.student_model import StudentData
from src.models.employed_model import EmployedData
from src.models.retired_model import RetiredData
from src.models.unemployed_model import UnemployedData
from src.models.guest_model import Guest
from src.models.guest_user_model import GuestUser
from src.models.feedback_model import Feedback
from src.models.knowledge_model import KnowledgeChunk
from src.models.chat_message_model import ChatMessage


async def init_db() -> None:
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGO_URI)
    await init_beanie(
        database=client[settings.DB_NAME],
        document_models=[
            User,
            StudentData,
            EmployedData,
            RetiredData,
            UnemployedData,
            Guest,
            GuestUser,
            Feedback,
            KnowledgeChunk,
            ChatMessage,
        ],
    )
