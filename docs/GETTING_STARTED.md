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

You'll also need API keys for:
- **Cohere AI** — https://dashboard.cohere.com (for AI advice)
- **Gmail App Password** — https://myaccount.google.com/apppasswords (for the contact form, optional)

---

## Setup 1 — Docker Compose (recommended)

Runs all 3 services (mongo + backend + frontend) in containers.

### Step 1 — Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in:

```env
mongo_uri=mongodb://admin:changeme@mongo:27017     # IMPORTANT: 'mongo' not 'localhost'
db_name=rukiai
jwt_secret=<a-long-random-secret>
cohere_api_key=<your-cohere-api-key>
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

### Step 2 — Start everything

```bash
docker compose up --build
```

First run takes 2-3 minutes (image download + dependency install).

### Step 3 — Visit

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- MongoDB: `mongodb://admin:changeme@localhost:27017`

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

### Step 2 — Configure backend env

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` — **IMPORTANT** when running backend locally use `localhost`:

```env
mongo_uri=mongodb://admin:changeme@localhost:27017     # localhost, not mongo
```

### Step 3 — Run backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate            # on Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO: Uvicorn running on http://127.0.0.1:8000
✅ MongoDB connected via Beanie
```

### Step 4 — Run frontend

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

# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Edit .env: mongo_uri=mongodb://localhost:27017 (no auth)
uvicorn main:app --reload

# Frontend (separate terminal)
cd frontend && pnpm install && pnpm dev
```

---

## Testing the backend

While the backend is running:

```bash
cd backend
bash test_api.sh
```

This tests all 19 endpoints with valid/invalid inputs. Expected output: all green ✅.

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

### Server starts but every request returns 500

Check `backend/.env` has:
- `jwt_secret` set (any string ≥ 32 chars)
- `cohere_api_key` — even a fake value works; the AI call falls back gracefully

### Frontend can't reach the backend

If you're running the frontend locally and backend in Docker (or vice-versa), CORS might block. The backend allows `http://localhost:5173` and `http://localhost:3000` by default — edit `main.py` if your frontend port differs.

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

# Add a new dependency
pip install <package>
pip freeze | grep <package> >> backend/requirements.txt
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
db.dropDatabase()                    # nuke everything (dev only!)
```

---

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the code is organized and [`API.md`](./API.md) for endpoint details.
