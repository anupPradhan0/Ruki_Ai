# Getting Started

Three ways to run the project: Docker (everything together), local Python + Docker Mongo, or fully local.

---

## Prerequisites

| Tool | Version | Used for |
|---|---|---|
| **Docker + Docker Compose** | latest | Easiest setup |
| **Python** | 3.11+ | Backend (if running locally) |
| **Node.js** | 20+ | Frontend |
| **pnpm** | 10+ | Frontend package manager |
| **MongoDB** | 7+ | Database (or use Docker) |
| **Ollama** | latest | Local AI runtime (Gemma 4 + embeddings) — install on the host that runs the backend |

You only need a cloud AI key if you (or specific users) want to switch the
provider in `/dashboard/settings` to Gemini / OpenAI / Anthropic / Cohere.
By default, RukiAI runs entirely on your own machine via Ollama — no key.

Optional:
- **Gmail App Password** — https://myaccount.google.com/apppasswords (for the contact form)

---

## Setup 1 — Docker Compose + Ollama on host

The compose stack runs Mongo + backend + frontend. Ollama runs on the host.

### Step 1 — Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
mongo_uri=mongodb://admin:changeme@mongo:27017     # IMPORTANT: 'mongo' not 'localhost' inside docker
db_name=rukiai
jwt_secret=<a-long-random-secret>

# AI — local Ollama is the default
ollama_host=http://host.docker.internal:11434      # backend container reaches host Ollama
ollama_model=gemma4:e2b
ollama_embed_model=nomic-embed-text
rag_top_k=3

smtp_user=<your-gmail>
smtp_password=<gmail-app-password>
email_from=<your-gmail>
email_receiver=<who-receives-contact-form>
mongo_root_user=admin
mongo_root_password=changeme
```

The root `.env` should have:
```env
db_name=rukiai
mongo_root_user=admin
mongo_root_password=changeme
```

### Step 2 — Install Ollama and pull models

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma4:e2b              # ~7 GB, used for chat/advice
ollama pull nomic-embed-text        # ~280 MB, used for RAG embeddings
```

Verify it's running:
```bash
curl http://localhost:11434/
# → "Ollama is running"
```

### Step 3 — Start everything

```bash
docker compose up --build
```

First run takes 2-3 minutes (image download + dependency install).

### Step 4 — Seed the knowledge base (one time)

The RAG knowledge base ships empty. Run the seed script once to populate it
with curated finance facts:

```bash
docker compose exec backend python scripts/seed_knowledge.py
```

You'll see ~23 lines like `✅ EMI to income ratio`. Idempotent — safe to re-run.

### Step 5 — Visit

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- MongoDB: `mongodb://admin:changeme@localhost:27017`

After signup, visit `/dashboard/settings` to confirm the AI provider is set
to **Local (Ollama)** with model `gemma4:e2b`.

### Stop everything

```bash
docker compose down              # stop containers
docker compose down -v           # also wipe MongoDB data
```

---

## Setup 2 — Local backend + Docker Mongo (fastest dev loop)

Useful when you're actively editing Python code and want fast restarts without rebuilding containers.

### Step 1 — Start MongoDB only

```bash
docker compose up -d mongo
```

Verify it's running:
```bash
docker exec rukiai_mongo mongosh -u admin -p changeme --eval "db.adminCommand('ping')"
```

### Step 2 — Install Ollama and pull models

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma4:e2b
ollama pull nomic-embed-text
```

### Step 3 — Configure backend env

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` — when running locally use `localhost` for both Mongo and Ollama:

```env
mongo_uri=mongodb://admin:changeme@localhost:27017
ollama_host=http://localhost:11434
ollama_model=gemma4:e2b
ollama_embed_model=nomic-embed-text
```

### Step 4 — Run backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate            # on Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed_knowledge.py    # one-time: seed RAG knowledge base
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO: Uvicorn running on http://127.0.0.1:8000
✅ MongoDB connected via Beanie
```

### Step 5 — Run frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Visit http://localhost:5173.

---

## Setup 3 — Fully local (no Docker)

If you have MongoDB installed natively.

```bash
# Make sure MongoDB is running on localhost:27017
sudo systemctl start mongod        # Linux

# Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma4:e2b
ollama pull nomic-embed-text

# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Edit .env: mongo_uri=mongodb://localhost:27017 (no auth)
python scripts/seed_knowledge.py
uvicorn main:app --reload

# Frontend (separate terminal)
cd frontend && pnpm install && pnpm dev
```

---

## Switching to a cloud AI provider (per user)

The default is local Gemma. To use Gemini / OpenAI / Anthropic / Cohere instead:

1. Sign up / log in.
2. Go to **/dashboard/settings → AI & API tab**.
3. Pick a provider, choose one of its 3 models, paste your API key, click Save.

That choice is stored on your User document (`ai_provider`, `ai_model`,
`ai_api_key`). All your dashboard advice and chat replies will route to that
provider from then on. RAG embeddings still happen locally — the provider
only sees the assembled prompt.

---

## Testing the backend

While the backend is running:

```bash
cd backend
bash test_api.sh
```

This tests all endpoints with valid/invalid inputs.

You can also explore manually at http://localhost:8000/docs.

---

## Common errors

### `OperationFailure: Authentication failed.`

Your MongoDB user/password don't match. Most common cause: you started Mongo with one set of creds, then changed them in `.env`.

**Fix**: wipe the Mongo volume and start fresh:
```bash
docker compose down -v
docker compose up -d mongo
```

### `pymongo.errors.ConfigurationError: The DNS query name does not exist`

Your `mongo_uri` is still the placeholder Atlas URI. Set it to:
- `mongodb://admin:changeme@localhost:27017` (local backend + Docker Mongo)
- `mongodb://admin:changeme@mongo:27017` (everything in Docker)
- `mongodb+srv://...` (your real Atlas URI)

### Dashboard shows "Unable to generate financial advice at this time."

Most common: Ollama is not running, or the model tag in `.env` doesn't match what's pulled.

```bash
curl http://localhost:11434/                 # should print "Ollama is running"
ollama list                                  # check the model tag matches OLLAMA_MODEL
```

If they're fine, check uvicorn logs for an `Ollama generate error` or `AI advice error` line — that has the underlying cause.

### `.env` value contains an inline comment

`.env` parsing is naive — anything after `=` is the value, including inline `#` comments. So this:
```env
ollama_model=gemma4:e2b  # this comment is part of the value
```
…makes `OLLAMA_MODEL` literally `"gemma4:e2b  # this comment is part of the value"`. Strip the inline comment.

### Chat replies say "I'm having trouble responding right now"

That's the friendly fallback when generation fails. Check uvicorn logs for the actual provider error (rate limit, bad API key, network issue).

### `pydantic_core._pydantic_core.ValidationError: Extra inputs are not permitted`

Your `.env` has a key the `Settings` class doesn't recognize. Either add it to `src/config/settings.py` or it's already handled — `extra="ignore"` is set, so this shouldn't happen anymore.

### `bcrypt.__about__` AttributeError

You're on a newer bcrypt that's incompatible with passlib. Pin it:
```bash
pip install bcrypt==4.0.1
```
(Already pinned in `requirements.txt`.)

### `Index already exists with a different name`

Your old indexes from before a model rewrite conflict with new ones. Drop the DB:
```bash
docker exec rukiai_mongo mongosh -u admin -p changeme --authenticationDatabase admin rukiai --eval "db.dropDatabase()"
```

After dropping, re-run `python scripts/seed_knowledge.py`.

### Server starts but every request returns 500

Check `backend/.env` has:
- `jwt_secret` set (any string ≥ 32 chars)
- `ollama_host` reachable from the backend (check `curl ${OLLAMA_HOST}/`)

### Frontend can't reach the backend (CORS)

The backend allows any `localhost` / `127.0.0.1` origin on any port via regex.
If you've put the frontend on a different host, edit `main.py` →
`allow_origin_regex` to add it.

---

## Re-seeding / extending the knowledge base

To add new finance facts to RAG:

1. Edit `backend/scripts/seed_knowledge.py` → add to the `SEED` list.
2. Re-run `python scripts/seed_knowledge.py`. Existing entries (matched by
   title) are skipped; new ones are embedded and inserted.

To wipe and re-seed from scratch, drop the collection first:
```
docker exec rukiai_mongo mongosh -u admin -p changeme --authenticationDatabase admin rukiai --eval "db.knowledge_chunks.drop()"
```

---

## Project commands cheat sheet

### Backend
```bash
# Activate virtual env
source backend/venv/bin/activate

# Run with auto-reload
uvicorn main:app --reload --port 8000

# Run tests
bash backend/test_api.sh

# Seed RAG knowledge base
python backend/scripts/seed_knowledge.py

# Add a new dependency
pip install <package>
pip freeze | grep <package> >> backend/requirements.txt
```

### Ollama
```bash
ollama list                           # show installed models
ollama pull gemma4:e2b                # chat / advice
ollama pull nomic-embed-text          # embeddings
ollama run gemma4:e2b "Hello"         # quick CLI test
```

### Frontend
```bash
cd frontend
pnpm dev            # dev server with HMR
pnpm build          # production build
pnpm preview        # preview production build
```

### Docker
```bash
docker compose up                    # foreground
docker compose up -d                 # detached
docker compose up --build            # rebuild images
docker compose logs -f backend       # follow backend logs
docker compose ps                    # show container status
docker compose down                  # stop
docker compose down -v               # stop + wipe volumes
```

### MongoDB shell
```bash
docker exec -it rukiai_mongo mongosh -u admin -p changeme --authenticationDatabase admin

# Inside mongosh:
use rukiai
show collections
db.users.find()
db.knowledge_chunks.countDocuments()  # how many RAG chunks indexed
db.chat_messages.countDocuments()     # how many persisted chat turns
db.dropDatabase()                     # nuke everything (dev only!)
```

---

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the code is organized and [`API.md`](./API.md) for endpoint details.
