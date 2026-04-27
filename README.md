# RukiAI — Smart Personal Finance Tracker

> AI-powered personal finance tracker that helps students, employed people, freelancers, the unemployed, and retirees make smarter financial decisions through personalized advice powered by Cohere AI.

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Backend** | Python 3.11 · FastAPI · Beanie (async MongoDB ODM) · Pydantic v2 |
| **Frontend** | React 18 · TypeScript · Vite · TanStack Router · TanStack Query · Tailwind CSS |
| **Database** | MongoDB 7 |
| **AI** | Cohere `command-r-plus` |
| **Auth** | JWT in HTTP-only cookies |
| **Email** | aiosmtplib (Gmail SMTP) |
| **Infra** | Docker Compose |

---

## Project Structure

```
Ruki_Ai/
├── backend/              FastAPI Python backend
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── src/
│       ├── config/        Pydantic Settings
│       ├── db/            Beanie/Motor MongoDB connection
│       ├── models/        MongoDB documents (Beanie)
│       ├── schemas/       Pydantic request/response models
│       ├── repositories/  DB query layer
│       ├── services/      Business logic
│       ├── routers/       FastAPI route handlers
│       ├── middleware/    JWT auth dependency
│       └── utils/         JWT, password, Cohere AI, email
│
├── frontend/             React + Vite frontend
│   ├── src/
│   │   ├── routes/        File-based routing (TanStack Router)
│   │   ├── components/    UI components & sections
│   │   └── lib/
│   ├── Dockerfile
│   └── nginx.conf
│
├── docs/                 Full project documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── GETTING_STARTED.md
│   └── TECH_STACK.md
│
├── docker-compose.yml    3-container stack (mongo + backend + frontend)
└── .env                  Root env vars for Docker Compose
```

---

## Quick Start

### Option 1 — Docker Compose (recommended)

```bash
# 1. Set up the environment
cp backend/.env.example backend/.env
# fill in COHERE_API_KEY, JWT_SECRET, SMTP creds

# 2. Run everything
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

### Option 2 — Local development

```bash
# 1. MongoDB only via Docker
docker compose up -d mongo

# 2. Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend (separate terminal)
cd frontend
pnpm install
pnpm dev
```

---

## Documentation

Full documentation lives in [`docs/`](./docs/):

| File | What's inside |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layers, data flow, request lifecycle, design decisions |
| [`docs/API.md`](docs/API.md) | All 22 API endpoints with request/response shapes |
| [`docs/GETTING_STARTED.md`](docs/GETTING_STARTED.md) | Detailed local setup, common errors, troubleshooting |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | What we use and why we chose it |

The interactive API explorer is always at **http://localhost:8000/docs** when the backend is running.

---

## Features

- **Multi-profile support** — Student, Employed, Unemployed, Retired, Guest. Each profile captures a tailored set of financial info
- **AI-powered advice** — Cohere generates personalised recommendations every 7 days based on actual spending patterns
- **JWT cookie auth** — HTTP-only cookies, 30-day expiry for users, 24-hour expiry for guests
- **Strict validation** — End-to-end Pydantic types from API boundary all the way to MongoDB
- **Auto-purging guests** — TTL indexes auto-delete guest data after 2/7 days
- **OpenAPI/Swagger** — Auto-generated interactive docs at `/docs`

---

## License

MIT — built by [Anup Pradhan](https://github.com/) (Mors)
