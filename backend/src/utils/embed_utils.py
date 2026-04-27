import math
import httpx
from src.config.settings import get_settings


async def embed_text(text: str) -> list[float]:
    """Embed a single string via local Ollama. Returns a vector or [] on failure."""
    settings = get_settings()
    payload = {"model": settings.OLLAMA_EMBED_MODEL, "prompt": text}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(f"{settings.OLLAMA_HOST}/api/embeddings", json=payload)
            r.raise_for_status()
            return r.json().get("embedding") or []
    except Exception as exc:
        print(f"Embedding error: {exc}")
        return []


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)
