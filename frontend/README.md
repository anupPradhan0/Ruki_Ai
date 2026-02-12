# RukiAI Frontend (TanStack Start / React + TanStack Router)

Migrated from EJS views to a React + TypeScript app with TanStack Router (file-based routing).

## Setup

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 (or the port Vite prints).

## Structure

- **`app/components/`** – Shared UI: `Header`, `Footer`, `ReviewButton` (reusable, accepts props).
- **`app/routes/`** – File-based routes:
  - `__root.tsx` – Root layout (Header + Footer + `<Outlet />`).
  - `index.tsx` – Home (converted from `views/index.ejs`).
  - `about`, `contact`, `features`, `how-it-works`, `login`, `signup` – Placeholder pages.
  - `user/login`, `user/signup`, `user/guest` – Auth/demo routes.
  - `dashboards/_layout.tsx` – Shared dashboard layout.
  - `dashboards/employed`, `guest`, `retired`, `student`, `unemployed` – Dashboard placeholders.
- **`app/routeTree.gen.ts`** – Generated route tree (regenerated when you run `npm run dev`).

## Conversion rules used

- EJS `<%= %>` → React `{}`.
- `class=` → `className=`.
- All navigation uses TanStack Router `<Link to="...">`.
- Props for shared components (e.g. `ReviewButton`) use TypeScript interfaces.

## Next steps

1. Run `npm run dev` and fix any route tree or type errors.
2. Migrate remaining EJS pages into the corresponding route files.
3. Fill in dashboard layout and pages from `views/dashboards/*.ejs` and `views/userType/*.ejs`.
4. Point API/auth calls to your backend (e.g. env base URL).
