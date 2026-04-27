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
    RAG_TOP_K: int = 3
    # Cosine similarity below this is treated as "no useful match" — chunk dropped.
    RAG_MIN_SIMILARITY: float = 0.30
    # MMR tradeoff: 1.0 = pure relevance (top-k), 0.0 = pure diversity. 0.7 balances both.
    RAG_MMR_LAMBDA: float = 0.7
    # Cap each rendered chunk at this many chars in the prompt — keeps prompt budget tight.
    RAG_MAX_CHUNK_CHARS: int = 500
    # Don't scan more than this many of a user's chat messages per retrieval (recency-ordered).
    RAG_HISTORY_SCAN_LIMIT: int = 500
    # Skip RAG entirely for queries shorter than this many characters (greetings, "ok", etc.).
    RAG_MIN_QUERY_CHARS: int = 12
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
