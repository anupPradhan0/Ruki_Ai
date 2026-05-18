from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import get_settings
from src.db.database import init_db
from src.services.qdrant_client import init_qdrant
from src.services import bm25_index
from src.routers.index_router import router as index_router
from src.routers.auth_router import router as auth_router
from src.routers.user_type_router import router as user_type_router
from src.routers.dashboard_router import router as dashboard_router
from src.routers.feedback_router import router as feedback_router
from src.routers.quiz_router import router as quiz_router
from src.routers.chat_router import router as chat_router
from src.routers.conversation_router import router as conversation_router
from src.routers.ai_settings_router import router as ai_settings_router
from src.routers.transaction_router import router as transaction_router
from src.routers.budget_router import router as budget_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("✅ MongoDB connected via Beanie")
    await init_qdrant()
    await bm25_index.build()
    yield
    print("🔌 Shutting down")


app = FastAPI(
    title="RukiAI Finance API",
    description="AI-powered personal finance tracker backend",
    version="1.0.0",
    lifespan=lifespan,
)

_settings = get_settings()
_cors_origins = _settings.allowed_origins_list

if _cors_origins:
    # Production: explicit allowlist from .env (e.g. https://rukiai.online).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Dev fallback: any localhost / 127.0.0.1 origin on any port.
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(index_router)
app.include_router(auth_router)
app.include_router(user_type_router)
app.include_router(dashboard_router)
app.include_router(feedback_router)
app.include_router(quiz_router)
app.include_router(chat_router)
app.include_router(conversation_router)
app.include_router(ai_settings_router)
app.include_router(transaction_router)
app.include_router(budget_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
