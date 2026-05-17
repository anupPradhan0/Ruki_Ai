from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    MONGO_URI: str
    DB_NAME: str = "rukiai"
    JWT_SECRET: str
    JWT_EXPIRE_DAYS: int = 30
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma4:e2b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # Qdrant
    QDRANT_URL: str = "http://qdrant:6333"
    QDRANT_KNOWLEDGE_COLLECTION: str = "finance_knowledge"
    QDRANT_MEMORY_COLLECTION: str = "user_chat_memory"
    QDRANT_VECTOR_SIZE: int = 768  # nomic-embed-text dimensionality

    # Retrieval
    RAG_MIN_QUERY_CHARS: int = 12
    RAG_KNOWLEDGE_TOP_K: int = 5            # final chunks from KB pipeline
    RAG_MEMORY_TOP_K: int = 3               # final chat turns from memory pipeline
    RAG_CANDIDATE_POOL: int = 20            # per-leg candidates before RRF / MMR
    RAG_RRF_K: int = 60                     # RRF constant — standard default
    RAG_MMR_LAMBDA: float = 0.7             # 1.0 = pure relevance, 0.0 = pure diversity
    RAG_MAX_CHUNK_CHARS: int = 500          # per-chunk truncation in the prompt
    RAG_MEMORY_HALF_LIFE_DAYS: int = 30     # time-decay half-life for user memory
    RAG_MEMORY_MAX_PER_USER: int = 10_000   # hard cap; oldest pruned beyond this
    RAG_MEMORY_EXCLUDE_RECENT_SECONDS: int = 60  # don't retrieve the in-flight turn

    # Query router
    RAG_ROUTER_TIMEOUT_SECONDS: float = 4.0
    RAG_ROUTER_FALLBACK: str = "BOTH"       # KNOWLEDGE | MEMORY | BOTH

    # Ingestion
    RAG_CHUNK_SIZE: int = 512
    RAG_CHUNK_OVERLAP: int = 64
    RAG_EMBED_CONCURRENCY: int = 4
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str
    EMAIL_RECEIVER: str
    APP_ENV: str = "development"
    # Comma-separated list of allowed CORS origins for production.
    # When empty, falls back to a permissive localhost regex (dev only).
    ALLOWED_ORIGINS: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
