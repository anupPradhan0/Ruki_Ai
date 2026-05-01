# RukiAI — Smart Personal Finance Tracker

> AI-powered personal finance tracker that helps students, employed people, freelancers, the unemployed, and retirees make smarter financial decisions. Privacy-first by default — runs locally on **Gemma 4 E2B** via Ollama, with optional cloud providers (Gemini · OpenAI · Anthropic · Cohere) selectable per user. Grounded in a finance knowledge base and the user's own past conversations through Retrieval-Augmented Generation (RAG).
 
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/)

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Backend** | Python 3.11 · FastAPI · Beanie (async MongoDB ODM) · Pydantic v2 |
| **Frontend** | React 18 · TypeScript · Vite · TanStack Router · TanStack Query · Tailwind CSS |
| **Database** | MongoDB 7 |
| **AI (default, local)** | Ollama · Gemma 4 E2B (chat) · `nomic-embed-text` (embeddings) |
| **AI (optional cloud)** | Google Gemini · OpenAI · Anthropic Claude · Cohere — per-user API key |
| **RAG** | Local embeddings + cosine similarity over `knowledge_chunks` (curated finance facts) and `chat_messages` (this user's past turns) |
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
│       └── utils/         JWT, password, ai_utils (multi-provider), embed_utils, rag_utils, email
│   └── scripts/
│       └── seed_knowledge.py   Populates the RAG knowledge base
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
# fill in JWT_SECRET, SMTP creds (no AI key needed by default — local Ollama is the default provider)

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

# 2. Install Ollama and pull the local AI models
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma4:e2b           # chat / advice generation
ollama pull nomic-embed-text     # embeddings for RAG

# 3. Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python scripts/seed_knowledge.py     # one-time: seed the finance knowledge base
uvicorn main:app --reload

# 4. Frontend (separate terminal)
cd frontend
pnpm install
pnpm dev
```

After signup, visit `/dashboard/settings` to switch the AI provider (Local Gemma is default; pick Gemini/OpenAI/Anthropic/Cohere and paste your own key to use cloud).

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
- **Local-first AI (privacy by default)** — Gemma 4 E2B runs entirely on your server via Ollama. No data leaves the box unless the user explicitly opts in.
- **Pick your provider per user** — Settings page lets each user switch to Gemini, OpenAI, Anthropic, or Cohere with their own API key (3 model options each)
- **Knowledge RAG** — Every reply is grounded in a curated knowledge base of India-flavored finance facts (PPF, ELSS, EMI rules, SCSS, NPS, etc.) retrieved by semantic similarity
- **User-data RAG** — Chat turns are persisted with embeddings, scoped per user, so the AI remembers prior conversations across sessions
- **10-question Self-Assessment quiz** — answers are first-class context in the prompt, anchoring advice to the user's habits and risk appetite
- **7-day advice cache** — Dashboard advice is cached, regenerated when stale or after the quiz is updated
- **JWT cookie auth** — HTTP-only cookies, 30-day expiry for users, 24-hour expiry for guests
- **Strict validation** — End-to-end Pydantic types from API boundary all the way to MongoDB
- **Auto-purging guests** — TTL indexes auto-delete guest data after 2/7 days
- **OpenAPI/Swagger** — Auto-generated interactive docs at `/docs`

---

## Contributing

Contributions are welcome. This project is fully open source under the MIT license — feel free to fork, modify, and submit pull requests.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for the full text.

The MIT License is a permissive open-source license that lets you:
- ✅ Use commercially
- ✅ Modify
- ✅ Distribute
- ✅ Use privately

The only requirement is including the original copyright and license notice in any copy of the project.

---

Built by **[Anup Pradhan](https://github.com/)** (Mors)
