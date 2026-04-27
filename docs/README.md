# RukiAI Documentation

Welcome to the RukiAI docs. This folder is the source of truth for how the
backend, frontend, and AI flows fit together.

## What you'll find here

| File | Read this if you want to... |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Understand how requests flow, how layers are organized, and how the React funnel works |
| [`API.md`](./API.md) | See every endpoint, its request body, and its response |
| [`GETTING_STARTED.md`](./GETTING_STARTED.md) | Run the project locally — Docker, local Python, or hybrid |
| [`TECH_STACK.md`](./TECH_STACK.md) | Know which libraries are used and why we picked them |

## Quick links

- **Live API explorer**: http://localhost:8000/docs (when backend is running)
- **Source — backend**: [`/backend`](../backend)
- **Source — frontend**: [`/frontend`](../frontend)
- **Project README**: [`../README.md`](../README.md)

## The user funnel at a glance

```
Sign up ──► /onboarding ──► /quiz ──► /dashboard
                                      ├── Overview (cards + AI advice)
                                      ├── AI Chat (sidebar)
                                      └── Settings (Info + AI provider)
```

- **Sign up** sets a JWT cookie and stashes `{user_id, user_type}` in `localStorage`.
- **Onboarding** asks the full profile form for the chosen user type.
- **Quiz** asks 10 MCQs (different bank per type) — answers persist on the profile and feed the AI prompt.
- **Dashboard** is gated: any user who lands there without completing onboarding or the quiz is bounced to the right step.
- **Login** uses the same gates: `GET /dashboard/{type}` returns `needs_onboarding` + `quiz_completed`, and the page routes accordingly.

## Recommended reading order

1. **Just want to run it?** → [`GETTING_STARTED.md`](./GETTING_STARTED.md)
2. **Building the frontend?** → [`API.md`](./API.md), then auto-generate types: `npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts`
3. **Adding a new endpoint?** → [`ARCHITECTURE.md`](./ARCHITECTURE.md) (layers section + cheat sheet at bottom)
4. **Working on the AI / RAG flows?** → [`ARCHITECTURE.md`](./ARCHITECTURE.md) → "AI advice, chat & RAG"
5. **Switching AI providers or fine-tuning prompts?** → [`ARCHITECTURE.md`](./ARCHITECTURE.md) → "Multi-provider AI"
6. **Curious about library choices?** → [`TECH_STACK.md`](./TECH_STACK.md)

---

If something here is wrong or stale, please open an issue. The docs reflect the
codebase as of the local-AI + multi-provider + RAG additions (April 2026).
