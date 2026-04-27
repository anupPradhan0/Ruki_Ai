from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.db.database import init_db
from src.routers.index_router import router as index_router
from src.routers.auth_router import router as auth_router
from src.routers.user_type_router import router as user_type_router
from src.routers.dashboard_router import router as dashboard_router
from src.routers.feedback_router import router as feedback_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("✅ MongoDB connected via Beanie")
    yield
    print("🔌 Shutting down")


app = FastAPI(
    title="RukiAI Finance API",
    description="AI-powered personal finance tracker backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(index_router)
app.include_router(auth_router)
app.include_router(user_type_router)
app.include_router(dashboard_router)
app.include_router(feedback_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
