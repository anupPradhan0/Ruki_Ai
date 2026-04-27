# RukiAI Documentation

Welcome to the RukiAI docs. This folder contains everything you need to understand, run, extend, and consume the RukiAI backend.

## What you'll find here

| File | Read this if you want to... |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Understand how the codebase is organized, how requests flow, and why decisions were made |
| [`API.md`](./API.md) | See every endpoint, what it accepts, and what it returns |
| [`GETTING_STARTED.md`](./GETTING_STARTED.md) | Run the project locally — Docker, local Python, or hybrid setups |
| [`TECH_STACK.md`](./TECH_STACK.md) | Know which libraries are used and why we picked them |

## Quick links

- **Live interactive API explorer**: http://localhost:8000/docs (when backend is running)
- **Source — backend**: [`/backend`](../backend)
- **Source — frontend**: [`/frontend`](../frontend)
- **Project README**: [`../README.md`](../README.md)

## Recommended reading order

1. **Just want to run it?** → [`GETTING_STARTED.md`](./GETTING_STARTED.md)
2. **Building the frontend?** → [`API.md`](./API.md) + auto-generate types: `npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts`
3. **Adding a new endpoint?** → [`ARCHITECTURE.md`](./ARCHITECTURE.md) (the layers section + cheat sheet at bottom)
4. **Debugging a weird error?** → [`GETTING_STARTED.md`](./GETTING_STARTED.md) (Common errors section)
5. **Curious about library choices?** → [`TECH_STACK.md`](./TECH_STACK.md)

---

If something in these docs is wrong or out of date, please open an issue. The docs are written to match the code as of the migration to Python/FastAPI (April 2026).
