# Strategic Lifecycle AI Framework

University capstone monorepo. Backend and frontend were built separately and are being
wired together now. I have 3 days. Prefer the smallest change that works.

## Layout
- `backend/` — FastAPI + SQLAlchemy 2.0 + Alembic + Postgres currently running on local machine. Complete, ~100 endpoints.
- `Build Webpage Framework/` — Vite + React 18 SPA. Complete UI, zero API calls.
- `Build Webpage Framework/Docs/` — canonical spec. Outranks the code.

## THE LIVE FRONTEND IS `src/app/WireframeApp.tsx` AND NOTHING ELSE
`src/main.tsx` renders `WireframeApp`. The files `App.tsx` and every `PrototypeRoutes*.tsx`
are dead code — nothing imports them. Never read, edit, or reference them. If you think you
need something from them, stop and ask me first.

## Package manager
Frontend uses **npm** (`npm install`, `npm run dev`). Ignore the README's pnpm instructions —
package-lock.json is current, pnpm-lock.yaml is stale.

## Two workspace ids (mid-transition)
The frontend has two workspace identities while pages are being wired to the API:
- `apiWorkspaceId` — the REAL id from `GET /workspaces`. Drives the header switcher and all
  wired pages (currently just Objectives). Persisted under `slaf.activeWorkspace`.
- `activeWorkspaceId` / `getTenantData()` — the MOCK id. Drives every not-yet-wired page.
  It is now frozen (no UI changes it), so mock pages always show FedEx until wired.
Wire remaining pages onto `apiWorkspaceId`, then delete the mock plumbing.

## Non-negotiables
- API JSON is camelCase; Postgres is snake_case. `app/schemas/base.py::ApiModel` maps them.
- Every list endpoint returns `{items, total, limit, offset}` — never a bare array.
- Errors are `{error: {code, message, details?}}`.
- Cross-workspace access returns 404 by design, not 403. Do not "fix" this.
- `ANTHROPIC_API_KEY` is backend-only. It must never appear in frontend code, in
  `import.meta.env`, or in any committed file.
- AI endpoints never write to the database. Only an explicit user Save persists anything.

## Alembic gotcha
`migrations/env.py` reads DATABASE_URL from the OS environment, NOT from `.env`.
Always `export DATABASE_URL=...` in the shell before running alembic.

## Working style
- I am new to Claude Code. Explain what you're about to do in one or two sentences first.
- Use plan mode for anything touching more than 3 files.
- Make the smallest change that achieves the goal. Do not refactor things I didn't ask about.
- When you finish a task, tell me the exact command to run to verify it worked.
