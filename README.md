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
| **Database** | MongoDB 7 (text + metadata) · Qdrant 1.12 (vector store) |
| **AI (default, local)** | Ollama · Gemma 4 E2B (chat) · `nomic-embed-text` (embeddings) |
| **AI (optional cloud)** | Google Gemini · OpenAI · Anthropic Claude · Cohere — per-user API key |
| **RAG** | **Hybrid** retrieval — BM25 + vector with RRF + MMR for the finance KB; vector + time-decay for per-user chat memory. Routed by a regex-then-LLM classifier. Embeddings always local. See [`docs/RAG.md`](docs/RAG.md). |
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
│       ├── services/      …includes qdrant_client, bm25_index, retrieval,
│       │                  query_router, memory_writer (RAG plumbing)
│       └── utils/         JWT, password, ai_utils (multi-provider), embed_utils, email
│   └── scripts/
│       ├── ingest_finance_docs.py   Chunk + embed + upsert finance docs into Qdrant
│       └── migrate_remove_old_rag.py  One-shot: lift legacy in-Mongo embeddings into Qdrant
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
├── docker-compose.yml    4-container stack (mongo + qdrant + backend + frontend)
└── .env                  Root env vars for Docker Compose
```

---

## Quick Start

### Option 1 — Docker Compose (recommended)

```bash
# 1. Set up the environment
cp backend/.env.example backend/.env
# fill in:
#   - JWT_SECRET (required)
#   - SMTP creds  (required for email verification + password-reset emails)
#   - FRONTEND_URL (defaults to http://localhost:5173 — change for prod so email
#                   links go to your deployed frontend)
# No AI key needed by default — local Ollama is the default provider.

# 2. Run everything
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

### Option 2 — Local development

```bash
# 1. MongoDB + Qdrant only via Docker
docker compose up -d mongo qdrant

# 2. Install Ollama and pull the local AI models
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma4:e2b           # chat / advice generation
ollama pull nomic-embed-text     # embeddings for RAG (768-dim, must match Qdrant)

# 3. Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python scripts/ingest_finance_docs.py   # seed the RAG knowledge base into Qdrant
# (point at your own .txt/.md files instead: `python scripts/ingest_finance_docs.py docs/finance/`)
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
| [`docs/RAG.md`](docs/RAG.md) | Deep dive into the RAG system — pipelines, retrieval algorithms, code map, ops |
| [`docs/API.md`](docs/API.md) | All API endpoints with request/response shapes |
| [`docs/GETTING_STARTED.md`](docs/GETTING_STARTED.md) | Detailed local setup, common errors, troubleshooting |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | What we use and why we chose it |

The interactive API explorer is always at **http://localhost:8000/docs** when the backend is running.

---

## Features

- **Multi-profile support** — Student, Employed, Unemployed, Retired, Guest. Each profile captures a tailored set of financial info
- **Local-first AI (privacy by default)** — Gemma 4 E2B runs entirely on your server via Ollama. No data leaves the box unless the user explicitly opts in.
- **Pick your provider per user** — Settings page lets each user switch to Gemini, OpenAI, Anthropic, or Cohere with their own API key (3 model options each)
- **Word-by-word streaming chat** — `POST /chat/{type}/stream` returns the reply over Server-Sent Events so the UI paints tokens as the LLM generates them. Works across all 5 providers; same persistence + RAG guarantees as the non-streaming path
- **Hybrid finance-KB RAG** — Curated India-flavored facts (PPF, ELSS, EMI rules, SCSS, NPS, …) retrieved via **BM25 + vector search merged by RRF, then re-ranked by MMR** — so exact terms like `80C` or `₹1.5 lakh` aren't lost by pure embedding search
- **Per-user memory RAG** — Every chat turn is embedded into a per-user Qdrant namespace; retrieval combines vector similarity with **exponential time-decay** (30-day half-life) so recent context outweighs stale chats
- **Smart query router** — Each message is classified `KNOWLEDGE` / `MEMORY` / `BOTH` (regex first, single-token LLM call as fallback) so we only pay for the retrieval the question actually needs
- **10-question Self-Assessment quiz** — answers are first-class context in the prompt, anchoring advice to the user's habits and risk appetite
- **7-day advice cache** — Dashboard advice is cached, regenerated when stale or after the quiz is updated
- **Account management** — Email verification, password reset, change password, "sign out of all devices" (real session invalidation via a `token_version` claim on the JWT, not just a cookie wipe)
- **JWT cookie auth** — HTTP-only cookies, 30-day expiry for users, 24-hour expiry for guests
- **Skeletons + toasts** — Layout-matching skeletons replace blank loading states; a tiny imperative toast API surfaces background errors so failures don't fall silent
- **Mobile-friendly** — `dvh` viewport units so the chat composer stays above the iOS keyboard, `text-base` inputs to skip Safari's zoom-on-focus, safe-area-inset–aware toast positioning, `viewport-fit=cover`
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
