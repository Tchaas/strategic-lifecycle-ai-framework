# Strategic Lifecycle AI Framework

Existing FastAPI/PostgreSQL backend and React frontend, being extended to v3.4.
There is no fixed deadline. Build complete user actions without temporary shortcuts.

## Read first

- `Build Webpage Framework/Docs/V3.4_GAP_ANALYSIS_AND_PLAN.md` contains the current
  decisions, build order, page records, and completion checks.
- The owner's latest explicit instructions take priority. The plan overrides conflicting
  older implementation notes, HTML references, mockups, and deviation entries.
- Record an unresolved requirement before implementing it. Do not guess.
- Current authorization is documentation only until the owner requests implementation.

## Working rules

- No customers use the database and there is no real data to preserve. Plan a clean,
  repeatable database setup, not a customer-data transfer or compatibility project.
  Do not reset a database as part of planning.
- Extend existing working code. Establish accounts, sign-in, email confirmation, recovery,
  membership, roles, and shared server permission checks before business-page work.
- Follow the user's journey, page by page. Build each page's server connection, storage,
  permissions, failure handling, and verification together.
- Completed pages read and save actual workspace information. No sample-data fallback,
  pretend success, or deferred connection work. Empty records display as empty.
- Keep the current UI style and structure. Reuse existing controls and navigation patterns
  when adding pages. Colors, fonts, branding, spacing, layout, or other aesthetic changes
  require explicit owner approval. A different mockup is not approval.
- Stripe is out of scope; AI credit charging is deferred. The four structural record caps
  are removed with affected page work. Workspace member limits remain a separate rule.
- Real email is required for confirmation, password recovery, invitations, and account
  linking. Simulated responses in tests do not establish that actual delivery works.

## Layout

- `backend/`: FastAPI, SQLAlchemy, Alembic, PostgreSQL. Existing code to extend and verify.
- `Build Webpage Framework/`: Vite, React 18, existing UI and `src/api/` clients.
- `Build Webpage Framework/Docs/`: current plan plus clearly marked earlier references.

## Active frontend

`src/main.tsx` renders `src/app/WireframeApp.tsx`.
Archived `App.tsx` and `PrototypeRoutes*.tsx` are not the running app. Do not read, edit,
or use them as implementation instructions unless the owner requests it.

Some pages already use the server but still mix saved records with sample information.
`apiWorkspaceId` is the saved workspace identity; `activeWorkspaceId` / `getTenantData()`
provide older sample state. Remove each completed page's sample paths in that page's work,
then remove shared helpers once unused. Check fields and actions, not just page counts.

## Package manager and checks

Use npm for the frontend, following the existing repository working convention.
The package-manager declaration and old pnpm notes disagree with that convention; do not
change package-manager metadata or lockfiles during unrelated page work.

- Frontend build: `cd "Build Webpage Framework" && npm run build`.
- Backend checks: use the project's environment and pytest against a dedicated test database.
  Check test setup before running; it may recreate tables.
- The frontend currently has no configured TypeScript checking command. Do not report
  `npx tsc --noEmit` as a valid check without first establishing that setup.
- During implementation, also exercise the page in the browser against the actual server.
  Check saving, refresh, returning sign-in, failed requests, and other users' access.

## Shared code rules

- API JSON is camelCase; database fields are snake_case. Use `ApiModel`.
- List responses use `{items, total, limit, offset}`.
- Errors use `{error: {code, message, details?}}`.
- Outsiders requesting another workspace's records receive 404. Members without permission
  receive the appropriate 403. Enforce this on the server.
- `ANTHROPIC_API_KEY` stays on the server, never in frontend code or committed secrets.
- AI may store suggestions and usage as required. It must not save or change business
  records without the user's explicit Save action.
- Alembic reads `DATABASE_URL` from the shell environment, not `.env`. Its `migrations`
  directory is a tool name, not a requirement to preserve disposable development records.

## Keeping work aligned

Before editing application code, identify the plan step and page, read its page record,
and check the current implementation. Keep edits to the agreed behavior.
Afterward, record changed files and checks actually run. A page is not complete until it
passes the plan's completion checklist. Update the plan before changing agreed requirements.
Explain work and findings in plain language. Do not claim checks passed when they were not run.
