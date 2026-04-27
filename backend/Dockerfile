# ── RukiAI backend image ──────────────────────────────────────────────────────
# Lean, single-stage Python 3.11 image. Does NOT bundle Ollama or any AI
# weights — those run on the host and the backend reaches them via the
# OLLAMA_HOST env var.

FROM python:3.11-slim AS runtime

# Don't write .pyc files; flush stdout/stderr immediately for clean container logs.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps:
#   - curl: used by HEALTHCHECK below
#   - build-essential is intentionally NOT installed; bcrypt 4.0.1 ships wheels.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so this layer is cached when only app code changes.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy the application source. Anything matched by .dockerignore is skipped.
COPY . .

# Drop root for runtime.
RUN groupadd --system app && useradd --system --gid app --no-create-home appuser \
 && chown -R appuser:app /app
USER appuser

EXPOSE 8000

# Hits the FastAPI app's mounted /docs path (lightweight, doesn't touch Mongo or Ollama).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:8000/docs > /dev/null || exit 1

# `uvicorn` is fine for single-instance deploys; for multi-worker prod, swap to
# `gunicorn -k uvicorn.workers.UvicornWorker -w 2 main:app` and bump `-w` to ~CPU count.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
