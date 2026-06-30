# Strategic Lifecycle AI Framework — Implementation Guide

**Status:** canonical implementation reference · **Audience:** anyone writing code for this web app
**Companion documents:** `Strategic_Lifecycle_AI_Framework_Architecture.html` (schema · API · rules · diagrams),
`Strategic_Lifecycle_Wireframe.html` (UI), `README.md` (index).

---

## 0. How to use this document (read first)

This guide exists to **prevent code drift**. During implementation it is easy to invent endpoints,
tables, or features that feel useful but quietly expand the system beyond what was designed. That is
how scope creep and inconsistency enter a codebase.

The rule is simple:

> **If a table, endpoint, field, rule, or screen is not described here or in the architecture
> reference, it is out of scope. Propose it as a change first; do not build it inline.**

The architecture reference is the source of truth for *what* the data model and API are. This guide is
the source of truth for *how* we build, secure, host, and operate it, and it pins the **scope
boundary** and **engineering standards** every change must respect. When code and these documents
disagree, the documents win — fix the code or, if the design is genuinely wrong, change the document
first and then the code.

A one-page **Definition of Done / anti-drift checklist** is in §10. Run it before every merge.

---

## 1. Project overview

**Strategic Lifecycle AI Framework** is a multi-tenant enterprise web application that translates
executive strategy into traceable, implementation-ready business architecture and product-discovery
artifacts, with AI as human-in-the-loop augmentation. It is the applied deliverable of an independent
research project (Georgia Tech CS 8903, *AI-Augmented Framework for Product Discovery and Software
Lifecycle Transformation*).

The system has **two distinct surfaces**:

1. **Public site (marketing / overview).** An unauthenticated landing experience that explains the
   project, the lifecycle, the governance model, and lets visitors **download the research paper**.
   This is content-and-CTA only — it does not touch tenant data. (See §9.)
2. **The application (authenticated).** The multi-tenant tool itself: workspaces, strategic
   objectives, the company-level business architecture, lean business cases, discovery, features,
   requirements, deliverables, and implementation tracking, all assisted by the stateless AI layer.

The two surfaces deliberately differ in visual identity (the public site and the app chrome use an
expressive retro / HUD theme; data-dense screens keep readable typography). Keep the theming in the
chrome and headings — never let it compromise the legibility of forms, tables, or data.

**Access flow.** On first visit a user sees only the **public landing page** and the **Sign Up / Log In**
entry — the app's lifecycle areas are not reachable yet. After authenticating (email/password or Google),
the user lands in their **workspace**, and the **Account & Setup**, **Phase 1**, **Phase 2**, and **AI**
areas become available. This gate is not just navigation hiding: the API enforces it (see §7/§8) — every
lifecycle endpoint requires a valid session and a workspace the user belongs to. Sign-up provisions the
`users` row, the first `workspaces` row, and the admin `workspace_members` row, and issues a JWT access
token plus a rotating `refresh_tokens` entry.

---

## 2. Scope guardrails (the anti-drift core)

### In scope
- The **33-table data model** exactly as specified in the architecture reference (22 entities + 11
  link tables). See §6.
- The **90 REST endpoints across 14 groups** (including the 4 stateless `/ai/*` endpoints). See §7.
- The **40 business rules in 9 categories** — they are behavioral requirements, not suggestions. See
  the architecture reference's Rules section.
- The lifecycle the model encodes: Workspace → Strategic Objective → (company-level) Business
  Architecture → Lean Business Case → Discovery → Features/Requirements → Conceptual Deliverables →
  Implementation (actuals).
- The **stateless AI assistance layer** (drafting/refinement that writes nothing until the user saves
  through normal entity endpoints).
- **Authentication** (email/password + Google) and the **public → authenticated access flow**:
  unauthenticated visitors get the landing page and Sign Up / Log In only; the lifecycle areas unlock
  after sign-in (§1, enforced per §7/§8).
- The **public landing page** and the **research-paper download** (§9).

### Out of scope (do not build without an approved change)
- New tables, new entity relationships, or new persisted state of any kind. The AI layer and the paper
  download are both explicitly designed to add **zero** tables.
- New top-level features (messaging, notifications, real-time collaboration, billing, analytics
  dashboards, exports, integrations) unless added to this document first.
- Editable objective-level actuals (actuals are entered once at implementation and **computed**
  upward — see §6).
- Auto-regeneration of deliverables (deliverables are human-finalized suggestions — see §6).
- Multi-provider auth beyond the two specified (email/password and Google).
- New npm packages, or refactors of unrelated modules, during a feature build.

### What a feature must satisfy
Every feature must map onto existing tables, endpoints, and rules, and must preserve the core
invariants:
- **Tenancy:** everything is workspace-scoped.
- **Company-level architecture:** one Business Architecture per workspace, shared across objectives.
- **Origin is provenance, not ownership:** components are workspace-scoped regardless of where they
  were created; they are reusable everywhere.
- **Three-altitude forecast, actuals-entered-once.**
- **Deliverables-as-suggestions** governance gate.

If a request cannot be expressed within these, it is a **change to the design** and goes through §0.

---

## 3. Architecture at a glance

```
                    ┌─────────────────────────────┐
   Public visitors  │  Public site (static)       │   research-paper.pdf (static asset)
        ───────────▶│  SPA landing + CTA + paper  │──────────────┐
                    └─────────────────────────────┘              │
                                                                 ▼
   Authenticated    ┌─────────────────────────────┐      ┌───────────────┐
   users            │  Vue 3 SPA (the app)         │      │ CDN / object  │
        ───────────▶│  TypeScript · Tailwind       │      │ storage       │
                    └──────────────┬──────────────┘      └───────────────┘
                                   │ HTTPS (JSON, JWT)
                                   ▼
                    ┌─────────────────────────────┐        ┌──────────────────┐
                    │  FastAPI backend            │───────▶│ AI provider      │
                    │  Pydantic · SQLAlchemy      │  HTTPS │ (key server-side)│
                    │  workspace-scoped, stateless│        └──────────────────┘
                    └──────────────┬──────────────┘
                                   │ SQL (private network)
                                   ▼
                    ┌─────────────────────────────┐
                    │  PostgreSQL (33 tables)     │
                    └─────────────────────────────┘
```

**Stack (authoritative):**
- **Frontend:** Vue 3 (Composition API, `<script setup>`), TypeScript, Tailwind CSS, hash/HTML5
  routing, Vite build. Reusable primitives live in `src/app/components/ui` — **reuse them; do not
  reinvent** cards, buttons, tabs, dialogs, badges, form controls, etc.
- **Backend:** Python FastAPI, Pydantic v2 (camelCase ↔ snake_case via field aliases), SQLAlchemy 2.x
  + Alembic migrations, Uvicorn behind Gunicorn workers.
- **Database:** PostgreSQL (`gen_random_uuid()` PKs, `timestamptz`, FKs `ON DELETE CASCADE`).
- **AI:** **Claude API (Anthropic)** is the AI provider. The backend calls the Messages API
  **server-side**; the API key never reaches the browser. Model tiering — Claude Haiku for routine
  drafting, Claude Sonnet/Opus for heavy synthesis (see §7).
- **Static assets** (SPA bundle, research-paper PDF): object storage + CDN.

---

## 4. Repository structure & engineering best practices

### Suggested layout (monorepo)
```
/frontend          Vue 3 + TS SPA (app) and public landing
  /src/app/components/ui     reusable primitives (reuse these)
  /public/assets/research-paper.pdf
/backend           FastAPI service
  /app/api         routers (one module per API group)
  /app/models      SQLAlchemy models (one per table)
  /app/schemas     Pydantic request/response models
  /app/services    business-rule logic (the 40 rules live here, not in routers)
  /app/core        config, security, db session, dependencies
  /migrations      Alembic
/docs              this guide, the architecture reference, the wireframe, README
/infra             IaC (Terraform or CDK) — see §8
```

### Standards
- **Branching:** short-lived feature branches off `main`; PRs require review and green CI. No direct
  pushes to `main`.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`…). Reference the table/endpoint
  /rule the change touches.
- **Formatting & linting (enforced in CI):** frontend — ESLint + Prettier + `vue-tsc` type-check;
  backend — Ruff + Black + Mypy. A merge with lint/type errors is not mergeable.
- **Testing:**
  - Backend: `pytest` — unit tests for each service/rule, integration tests per endpoint against a
    disposable Postgres (Testcontainers or a CI service container). **Every business rule in §6 needs a
    test that proves it is enforced**, especially tenancy isolation and the validation gates.
  - Frontend: Vitest for component/logic, Playwright for critical e2e flows (auth, objective creation,
    discovery roll-down, paper download).
  - Target meaningful coverage on services and API; do not chase 100% on trivial code.
- **Config:** 12-factor. All configuration via environment variables; nothing environment-specific
  hard-coded. `.env` for local only and **never committed**. A checked-in `.env.example` documents the
  variables.
- **Dependencies:** pinned (lockfiles committed). **No new npm packages** mid-feature without an
  approved change (a long-standing project constraint). New backend deps require justification in the
  PR.
- **No unrelated refactors** inside a feature PR — keep diffs reviewable and scoped.
- **Mock-data discipline:** frontend mock data must be shaped to the API contracts (camelCase) so that
  wiring to the backend is mechanical once endpoints exist.

---

## 5. Local development & environment configuration

### Prerequisites
- Node.js (LTS) + the project's package manager for the frontend.
- Python 3.12+ for the backend.
- Docker (for a local Postgres, and to build/run the API container).

### Running locally
- **Database:** start Postgres in Docker, then apply migrations with `alembic upgrade head`.
- **Backend:** run FastAPI with `uvicorn` (auto-reload in dev). It reads configuration from the
  environment.
- **Frontend:** run the Vite dev server; point it at the local API base URL.

### Environment variables (document them in a committed `.env.example`; never commit real values)
- `DATABASE_URL` — Postgres connection string (SSL in non-local).
- `JWT_SECRET` / `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` — token signing + lifetimes.
- `ANTHROPIC_API_KEY` — Claude API key (or the Bedrock IAM configuration if running Anthropic models on
  Bedrock).
- `ANTHROPIC_VERSION` — Claude API version header (e.g., `2023-06-01`).
- `ANTHROPIC_MODEL_DRAFT` — pinned model ID for routine drafting (e.g., `claude-haiku-4-5-20251001`).
- `ANTHROPIC_MODEL_SYNTH` — pinned model ID for heavy synthesis (e.g., `claude-sonnet-4-6`, or
  `claude-opus-4-8` for the most demanding deliverables).
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` — for the Google auth provider.
- `CORS_ALLOWED_ORIGINS` — the SPA origin(s) only.
- `AWS_REGION` — region for the AWS clients (Secrets Manager, SES, SQS).
- `REDIS_URL` — cache + shared rate-limit counter store (§11.1, §11.4); omit to fall back to in-process
  for a single-instance prototype.
- `RATE_LIMIT_AUTH` / `RATE_LIMIT_GENERAL` — limits for auth and general endpoints (§11.1).
- `AI_USER_QUOTA` — per-user `/ai/*` quota, e.g. drafts per hour (§11.1, cost-abuse control).
- `SES_FROM_EMAIL` — verified sender for transactional email (§11.5).
- `EMAIL_QUEUE_URL` — SQS queue URL for async email jobs (§11.5).
- `SENTRY_DSN` — error tracking (§11.7); optional locally.

> In AWS, the sensitive values above (`ANTHROPIC_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, OAuth secret) are
> not set as plain env vars — they are pulled from **Secrets Manager** at runtime via the service's IAM
> role (§11.3). `.env` is for local development only and is never committed.

### AI during UI work
The frontend can run against **mocked `/ai/*` responses** (shaped to the real contract) so UI can be
built without spending tokens; wire to the live provider via a dev key (or Bedrock) when validating the
end-to-end flow. This mirrors the broader mock-data discipline in §4.

---

## 6. Schema & data relations

The architecture reference holds every column, type, foreign key, and enum. **Do not duplicate or
re-derive the schema in code comments or elsewhere — link to the reference and (once generated) the
DDL.** This section pins the conventions and the relationship invariants the code must enforce.

### Canonical shape
- **33 tables** = 22 entity tables + 11 link (junction) tables.
- **90 endpoints** across 14 groups; **40 rules** across 9 categories.

### Conventions (apply to every table)
- Primary keys: `uuid` via `gen_random_uuid()`.
- Timestamps: `timestamptz`. Every entity table carries `created_by_user_id` (FK → `users`),
  `created_at`, `updated_at`. Link tables carry `created_at` and a `UNIQUE` constraint on the pair.
- Foreign keys: `ON DELETE CASCADE`.
- Money: `double precision` (float). Metrics: `integer`.
- API JSON is **camelCase**; Postgres is **snake_case**. Pydantic aliases bridge the two — do not leak
  snake_case into API responses or camelCase into the database.

### Relationship invariants (must be enforced in services, with tests)
1. **Tenancy.** Workspace = company profile = tenant boundary. **Every query is filtered by
   `workspace_id`.** There is no code path that reads or writes tenant data without a workspace scope
   derived from the authenticated user's membership. This is the single most important security
   invariant (see §8).
2. **Company-level architecture.** Exactly **one** `business_architecture_components` row per workspace
   (unique on `workspace_id`), shared across all objectives and cases. It is optional for a new venture
   and may be built incrementally.
3. **Origin is provenance, not ownership.** All architecture components (`value_streams`,
   `key_activities`, `business_capabilities`, `business_processes`, `stakeholders_personas`,
   `information_concepts`, `business_impacts`) carry `origin ∈ {architecture, discovery}`. The flag
   records where a component was first created and **never** scopes it. Every component is
   workspace-scoped and reusable by any objective or case. A new objective selects existing value
   streams/capabilities via the `strategic_objective_value_streams` / `strategic_objective_capabilities`
   junctions; finer-grained components are referenced through value streams and the objective's cases.
   **Reuse links to the existing row; it never copies.**
4. **Two entry points, one model.** The architecture can be established from the strategic phase or
   from discovery (triggered by identifying impacted business areas). Same tables, same roll-down:
   architecture → value streams → key activities, with capabilities/processes/personas/info-concepts/
   impacts hanging off the architecture.
5. **Three-altitude forecast.** Forecast at objective (hypothesis + integer metrics + qualitative
   `financial_impact`) → case (`forecast_cost`/`forecast_value`) → discovery (qualitative).
6. **Actuals entered once.** Actuals are entered only at implementation, per value stream
   (`implementation_value_streams.allocated_cost/value`). Objective-level actuals are **computed**, never
   stored, never editable. The app is a tracking tool, not a calculator that persists derived numbers.
7. **Deliverables are suggestions.** Conceptual deliverables are seeded from traceability data
   (`source = suggested`), edited by a human, then saved (`source = user_finalized`). No
   auto-regeneration overwrites human-finalized content.
8. **Traceability spine.** `case → feature → capability → value stream / key activity` is the
   relationship every link table exists to preserve. Deleting or detaching must respect it.

### Migrations
- All schema changes go through Alembic migrations, reviewed like code. The migration set is the
  executable form of the architecture reference. **Generating the initial DDL/migrations from the
  reference is the next implementation step.**

### Company profile = AI context
The `workspaces` row is the company profile and carries strategic-context fields — `operating_model`,
`business_model`, `primary_customers`, `primary_products`, `strategic_context` (plus `business_unit`,
`industry`, `company_size`, etc.). These were folded into the schema so the UI and data model align, and
they are the **lean company context the AI layer sends to Claude** when drafting objectives, cases, and
discovery artifacts. `annual_revenue` is static profile context only — it is **not** part of the
forecast/actuals financial model.

---

## 7. API documentation

The architecture reference lists all **90 endpoints across 14 groups** with their methods, paths,
touched tables, and notes. Treat that list as the contract. This section pins cross-cutting
conventions.

### Conventions
- **Style:** REST over HTTPS, JSON request/response, **camelCase** payloads.
- **Versioning:** prefix routes with `/api/v1`. Breaking changes bump the version; they do not mutate
  v1 in place.
- **Auth:** JSON Web Token access tokens (short-lived) + **rotating refresh tokens** persisted in
  `refresh_tokens`. Endpoints other than auth and the public site require a valid access token.
- **Tenancy in the API:** the workspace is resolved from the authenticated user's membership and route
  context — never trusted from a client-supplied body field alone. Cross-workspace access returns 404
  (not 403) to avoid leaking existence.
- **Validation gates:** the "active" gates in the rules (e.g., an objective needs initiative name +
  executive objective + value category + problem/opportunity + value hypothesis before it can move to
  `active`) are enforced server-side and surfaced as structured 422 errors.
- **Errors:** a consistent error envelope `{ "error": { "code", "message", "details?" } }`. Use correct
  status codes (400/401/403/404/409/422/429/500). Never leak stack traces or SQL.
- **Pagination/filtering:** list endpoints paginate (cursor or limit/offset) and filter within the
  workspace scope only.
- **Idempotency:** mutations are safe to retry where feasible; use `PATCH` for partial updates (the API
  uses 17 PATCH endpoints by design).
- **Rate limiting:** apply per-user/IP limits, with stricter limits on the `/ai/*` group (see below).

### The AI group (4 endpoints, stateless)
`POST /ai/draft`, `POST /ai/refine`, `POST /ai/suggest-links`, `GET /ai/usage`.
- **Backend-mediated:** the browser never holds provider keys; the backend assembles a **lean context
  (linked records only)**, picks a model, and calls the provider.
- **User-triggered only:** nothing fires on typing or focus — every call is an explicit user action.
  This is the primary cost control.
- **One structured call drafts a whole component** (returns all fields), not one call per field.
- **Stateless:** responses populate **editable** fields in the browser; **nothing is persisted** until
  the user saves through the normal entity endpoints. The `/ai/*` group therefore adds **no tables**
  and writes **no tenant data** itself.
- **Model tiering + caching:** a cheaper model handles routine drafting; a larger model is reserved for
  heavy synthesis; prompt caching keeps input tokens small.

### AI provider: Claude API (Anthropic) — required
The AI component is built on the **Claude API**. This is a firm requirement, not a placeholder.

- **Endpoint & SDK:** the backend calls the **Messages API** (`POST https://api.anthropic.com/v1/messages`),
  authenticated with the `x-api-key: $ANTHROPIC_API_KEY` and `anthropic-version` headers — in practice via
  the official **`anthropic` Python SDK** (`client.messages.create(...)`). The key lives only on the
  backend (Secrets Manager / env), never in the browser.
- **Models (pin the IDs; do not use evergreen aliases in production):**
  - **Drafting / routine** → **Claude Haiku** (`claude-haiku-4-5-20251001`) — fastest and most
    cost-effective; the default for `/ai/draft` and `/ai/suggest-links`.
  - **Heavy synthesis** → **Claude Sonnet 4.6** (`claude-sonnet-4-6`) as the balanced default, escalating
    to **Claude Opus 4.8** (`claude-opus-4-8`) only for the most demanding deliverable generation.
  - This realizes the "model tiering" cost control above. Read the IDs from `ANTHROPIC_MODEL_DRAFT` /
    `ANTHROPIC_MODEL_SYNTH` (§5) so they can be re-pinned without code changes.
- **Structured output in one call:** use Claude's **structured outputs / tool use** to return all fields of
  a component as a single typed JSON object — this is exactly the "one structured call drafts a whole
  component" requirement. Validate the response against the entity's Pydantic schema before returning it to
  the browser.
- **Prompt caching:** cache the stable system prompt and any reused framework context so repeat calls only
  pay for the small, record-specific delta — the main lever (with model tiering and lean context) keeping
  per-call cost low.
- **Batch API (optional):** if deliverable drafts are ever generated in bulk and not interactively, the
  asynchronous Batch API is cheaper — but it stays within the same stateless pattern (still nothing
  persists until the user saves).
- **Verify before pinning:** model IDs and availability change; confirm against the official model list
  (`https://docs.claude.com/en/docs/about-claude/models/overview`) when setting `ANTHROPIC_MODEL_*`.

### The research paper is **not** an API endpoint
The paper download is a **public static asset** (see §9), not an authenticated route and not backed by
a table. Keep it that way — do not add a `/papers` resource or a DB row for it.

---

## 8. Security & data protection

Security here is mostly about **multi-tenant isolation, credential hygiene, and careful AI data
handling**. The academic build does not process regulated/PII-heavy data, but the design below is the
standard the code must meet and the posture that scales to production.

### Authentication
- Passwords hashed with **Argon2id** (or bcrypt with a strong work factor); never store or log
  plaintext. `users.password_hash` only.
- Google OAuth via `auth_provider = google` + `google_sub`; validate ID tokens against Google's keys.
- **JWT access tokens** short-lived (e.g., 15 min). **Refresh tokens** are random, hashed at rest in
  `refresh_tokens`, **rotated** on use, and revocable (logout, reuse-detection). Store tokens in
  `Secure`, `HttpOnly`, `SameSite` cookies or a secured client store — never in `localStorage` for the
  authenticated app.

### Authorization & tenancy isolation (the critical control)
- Every data-access path is **scoped to the caller's workspace membership**. Enforce this centrally
  (a FastAPI dependency that yields a workspace-scoped session/repository), not ad hoc per route, so it
  cannot be forgotten.
- Respect `workspace_members` roles for any privileged action. Never derive authorization from a
  client-supplied `workspaceId` without verifying membership.
- Tests must include **negative cases**: user A cannot read or mutate user B's workspace data.

### Input/output & web hardening
- Validate all input with Pydantic; reject unknown fields where appropriate.
- Use parameterized queries / the ORM exclusively — **no string-built SQL**.
- Output is JSON (no server-side HTML templating of user content); the SPA escapes by default — avoid
  `v-html` on user/AI-provided content.
- **OWASP Top 10** baseline: injection, broken access control (the tenancy control above), insecure
  design, security misconfiguration, vulnerable dependencies, SSRF (the backend's outbound AI call must
  target only the known provider host), auth failures, integrity, logging gaps, and
  identification/identity.
- **Security headers & CORS:** strict CORS allow-list (the SPA origins only), HSTS, `X-Content-Type-
  Options`, a sensible CSP, `Referrer-Policy`. TLS everywhere (HTTPS only; redirect HTTP).

### Secrets & configuration
- No secrets in code or the repo. Local: `.env` (git-ignored). Cloud: **AWS Secrets Manager** (or SSM
  Parameter Store) for DB credentials and the **AI provider API key**; inject at runtime.
- Rotate credentials; scope IAM to least privilege (the API task reads only the secrets it needs).

### Data protection
- **In transit:** TLS for browser↔API, API↔DB (RDS SSL), and API↔AI provider.
- **At rest:** enable storage encryption on the database (KMS) and on the object store.
- **Backups:** automated DB backups with point-in-time recovery; test restores.
- **Data classification & retention:** tenant content is confidential; define retention and a deletion
  path (cascading deletes already exist at the FK level). Do not collect PII the product does not need.

### AI-specific data handling (Claude API)
- Send **Claude only the lean, directly-linked records** required for the draft — never whole-workspace
  dumps, never secrets, never credentials.
- The `ANTHROPIC_API_KEY` is stored in Secrets Manager and read only by the backend; it is never sent to
  the browser, logged, or committed.
- Anthropic does **not** use Claude API inputs or outputs to train its models by default, and
  **zero-data-retention** is available for qualifying accounts; confirm the current commercial terms and
  enable ZDR if required. Strip anything sensitive before it leaves the backend regardless.
- The user reviews and edits every AI suggestion before it is saved — the human-in-the-loop gate is
  also a data-quality and accountability control.

### Logging & audit
- Structured logs with correlation IDs; **never log secrets, tokens, passwords, or full AI payloads**.
- The `created_by_user_id` + timestamps on every entity provide a basic audit trail; preserve it.

### Dependency & supply-chain security
- Automated dependency scanning (e.g., Dependabot / `pip-audit` / `npm audit`) in CI; patch promptly.
- Pin versions; review transitive additions.

---

## 9. Public landing page & research-paper download

### The landing page (overview)
A public, unauthenticated page whose job is to **explain the project and route visitors** — into the
app or to the research paper. It is content + CTAs only and reads **no tenant data**. Canonical
sections (the live site already realizes most of these; this formalizes them as in-scope):
- Hero: project title, one-line value statement, primary CTAs (**Enter the app**, **Download the
  research paper**).
- The strategy-to-implementation gap (the problem framing).
- The lifecycle phases (Strategy → Business Architecture → Discovery → Conceptual Architecture →
  Lifecycle → Value).
- AI augmentation with explicit **human-oversight** labeling (governance is a feature, not a footnote).
- Representative enterprise scenarios (e.g., FedEx Network 2.0).
- Governance / trust commitments.
- Project information (lead, program, repository) and footer links (Research Paper, GitHub, Contact,
  References).

This page is represented in the wireframe as a dedicated **Landing** screen in the app's clean
enterprise style. The live public site may keep its own expressive identity; the two need not look
identical, but both must offer the paper download and the same factual overview.

### Research-paper download (the new feature, scope-aligned)
**Design decision:** the paper is a **public static PDF asset** served from object storage + CDN
(`/<cdn>/assets/research-paper.pdf`). The download control is a plain anchor with the `download`
attribute. Deliberately:
- **No authentication** — the paper is public.
- **No database table and no authenticated API endpoint** — this keeps the new feature inside the
  scope discipline (it adds nothing to the 33-table model or the 90-endpoint surface). It is the same
  "add no tables" principle the AI layer follows.
- **Optional, out-of-scope-by-default:** if download counts are ever wanted, a fire-and-forget,
  PII-free analytics beacon can be added — but that is a separate, approved change, not part of this
  feature.

**Asset workflow:** place the final paper at `frontend/public/assets/research-paper.pdf`. The current
GitHub Pages deploy serves it directly; on AWS it is an S3 object behind CloudFront (§8: encryption at
rest, HTTPS in transit). Until the final paper is ready, ship a clearly-labeled placeholder PDF and
swap the file — no code change required.

---

## 10. AWS hosting

**Posture:** cost-optimized primary architecture for the current academic phase, with a documented
path to scale. Everything below is defined in **Infrastructure as Code** (Terraform or AWS CDK) in
`/infra` so environments are reproducible and reviewable — no click-ops in the console for anything
that matters.

### 10.1 Cost-optimized architecture (primary — use this now)

```
         Route 53 (DNS) ──► CloudFront (CDN, HTTPS via ACM)
                               │
              ┌────────────────┴───────────────────┐
              ▼                                     ▼
     S3 (static)                          AWS App Runner
     • SPA bundle                         • FastAPI container (from ECR)
     • research-paper.pdf                 • autoscaling, scale-to-low
                                            │  reads secrets at runtime
                                            ▼
                              Secrets Manager / SSM Parameter Store
                              • DB credentials   • AI provider API key
                                            │
                                            ▼
                              Amazon RDS for PostgreSQL
                              • db.t4g.micro, single-AZ, encrypted
                              • automated backups + PITR
                                            │
                                            ▼
                              (outbound HTTPS) ──► AI provider
```

- **Static (SPA + paper):** **S3** for the built SPA bundle and `research-paper.pdf`, fronted by
  **CloudFront** with an **ACM** TLS certificate and **Route 53** for the domain. Cheap, fast, scales
  on its own.
- **API:** **AWS App Runner** running the FastAPI container image from **ECR** — managed HTTPS,
  autoscaling, and low minimum cost; you are not paying for an idle fleet. (Absolute-cheapest fixed-
  price alternative: a single **AWS Lightsail** container or small instance + Lightsail managed
  Postgres.)
- **Database:** **Amazon RDS for PostgreSQL**, `db.t4g.micro`, single-AZ, **storage encrypted (KMS)**,
  automated backups with point-in-time recovery, in **private subnets** (no public access). The API
  reaches it over the private network; a security group allows only the API.
- **Secrets:** **Secrets Manager** (or SSM Parameter Store for lower cost) for DB creds and the AI key;
  injected at runtime, never baked into the image.
- **AI:** the backend calls the **Claude API** over HTTPS with `ANTHROPIC_API_KEY` pulled from Secrets
  Manager. **Alternative:** run **Anthropic's Claude models on Amazon Bedrock** (IAM-based access, model
  IDs prefixed `anthropic.`, no external key) — swap the client without changing the stateless design.
- **Observability:** **CloudWatch** logs, metrics, and a couple of alarms (5xx rate, DB CPU/storage).
- **Networking:** a small **VPC**; API egress to the provider; RDS private.

**Rough cost intuition (single small environment):** the static tier is near-free under CloudFront/S3
pricing; the main spend is the RDS instance and App Runner usage — low-tens-of-USD/month range, with
free-tier offsets early on. Turn off or downsize non-prod environments when idle.

### 10.2 Scale-up path (production — when load/SLAs require it)

- **Static:** unchanged — S3 + CloudFront already scale globally.
- **API:** move to **ECS Fargate behind an Application Load Balancer**, multiple tasks with target-
  tracking autoscaling across **multiple AZs** (or EKS if the org standardizes on Kubernetes). Optionally
  front with **API Gateway**.
- **Database:** **RDS Multi-AZ** (or **Aurora PostgreSQL**) for failover; add **read replicas** for read
  scaling; keep automated backups + PITR.
- **Edge & security:** **AWS WAF** on CloudFront/ALB, **Shield**, and tightened rate limiting; consider
  **Cognito** if offloading auth becomes worthwhile.
- **Caching / async:** **ElastiCache (Redis)** for sessions, rate-limit counters, and hot reads;
  **SQS + worker tasks** (or **Step Functions**) if AI calls become heavy or batched.
- **Observability:** CloudWatch dashboards + alarms and **X-Ray** tracing end-to-end.
- **Delivery:** multi-environment pipeline (dev → staging → prod) with blue-green or canary deploys.

### 10.3 CI/CD
- **GitHub Actions**: on PR, run lint + type-check + tests. On merge to `main`:
  - Backend: build the container, push to **ECR**, trigger the App Runner (or Fargate) deploy.
  - Frontend: build, **sync to S3**, **invalidate CloudFront**.
  - DB: run **Alembic migrations** as a gated step.
- IaC changes (`/infra`) are planned and applied through the pipeline with review — never by hand.

---

## 11. Operational hardening & abuse prevention

This section makes the prototype resilient to load and resistant to abuse. The principle matches §10:
**stand up the right pattern now with cheap managed AWS services, and document the heavy-duty version as
the scale-up.** The bar is that the app does not fall over under load and cannot be cheaply abused —
especially the paid `/ai/*` calls.

### 11.1 Rate limiting (two layers)
Rate limiting lives at two layers because they stop different things:

- **Edge — AWS WAF on CloudFront.** Rate-based rules cap requests per source IP over a rolling window and
  absorb volumetric floods *before* they reach the app; add the AWS managed rule groups (common exploits,
  known-bad inputs). This is the first wall.
- **Application — FastAPI middleware.** `slowapi` (or a small token-bucket dependency) for **tiered**
  limits, which is where the real control is:
  - **Auth endpoints** (`/auth/login`, `/auth/signup`, `/auth/refresh`): tight per-IP limits plus
    exponential backoff / temporary lockout after repeated failures — defeats credential stuffing and
    brute force.
  - **`/ai/*` endpoints:** strict **per-user quotas** (e.g., N drafts per user per hour). Every call costs
    money, so this is the primary **cost-abuse** control; enforce it against the same usage `/ai/usage`
    reports.
  - **General CRUD:** looser per-user ceilings to catch scripted misuse.

**Requirements:** every limited response returns `429` with a `Retry-After` header; limits are
configurable via environment (§5); counters must be **shared across instances** (Redis, §11.4) once more
than one App Runner instance runs — in-memory counters are acceptable only for a single-instance
prototype and must be flagged as a known limitation.

### 11.2 Database security (AWS-native)
Most of this is RDS configuration set once and verified:

- **Network isolation:** RDS in **private subnets**, `PubliclyAccessible = false`, security group admits
  traffic **only** from the application's security group.
- **Encryption:** storage encryption with **AWS KMS** (enable at creation — it cannot be turned on in
  place later) and **TLS enforced in transit** (`rds.force_ssl = 1` in the parameter group; app connects
  with `sslmode=verify-full`).
- **Credentials:** DB credentials in **Secrets Manager with rotation**; prefer **IAM database
  authentication** so the app uses short-lived tokens instead of a long-lived password.
- **Least privilege:** runtime app connects as a **non-superuser** role with only the privileges it
  needs; migrations run under a **separate role**. Postgres **Row-Level Security** scoped by
  `workspace_id` is an optional defense-in-depth layer on top of the app-level tenancy control (which
  remains primary).
- **Runaway-query guards:** set `statement_timeout` and `idle_in_transaction_session_timeout` so a single
  slow or stuck query cannot pin a connection.
- **Connection limits:** `db.t4g.micro` has a low max-connections ceiling and is the **likely first
  bottleneck under load**. Use SQLAlchemy's pool now; add **RDS Proxy** at scale (it also smooths failover
  and credential handling).
- **Operational safety:** automated backups + point-in-time recovery, deletion protection, and
  **Performance Insights** + CloudWatch alarms (CPU, connections, free storage, latency).

### 11.3 Secrets — server-side, never in the UI or Git
The Claude key in particular must never be exposed. Non-negotiable.

- **Never in the frontend.** The SPA only ever calls **your** API; every Claude request is made by FastAPI
  server-side. `ANTHROPIC_API_KEY` and all other secrets never reach the browser, a build artifact, or
  client config.
- **Storage & injection.** Hold the Claude key, DB credentials, `JWT_SECRET`, and OAuth secret in
  **Secrets Manager** (or SSM Parameter Store SecureString, cheaper), injected at runtime through a
  **least-privilege IAM role** on the App Runner service. Never baked into the container image or an env
  file in the repo.
- **Prevent accidental commits — layered:**
  - `.gitignore` for `.env`, `*.pem`, etc.; commit only a placeholder `.env.example`.
  - A **pre-commit hook** running `gitleaks` (or `detect-secrets`) to block secrets locally.
  - A **CI secret scan** (`gitleaks` / `trufflehog`) that **fails the PR** on a hit.
  - **GitHub Secret Scanning + Push Protection** enabled (Anthropic keys have a recognizable prefix and
    are caught at push time).
- **No long-lived cloud keys in CI:** the deploy pipeline authenticates to AWS via **GitHub OIDC → IAM
  role assumption**, so there are no static AWS keys stored in GitHub either.
- **Leak response:** if any key is ever committed, **rotate it immediately** (revoke + reissue in the
  provider console) and treat it as compromised; scrubbing git history is secondary.

### 11.4 Caching repeated requests
Three layers, each cutting a different cost:

- **CloudFront (edge):** caches the static SPA bundle and the research-paper PDF with long TTLs and
  content-hashed filenames (invalidate on deploy); cacheable `GET`s use `Cache-Control` / `ETag`.
- **ElastiCache (Redis):** caches hot reads (a workspace's architecture, reference lists) keyed by
  `workspace_id` + entity and invalidated on write — and is the **shared store for rate-limit counters**
  (§11.1). A `cache.t4g.micro` is inexpensive; an in-process cache is an acceptable single-instance
  stand-in to begin with.
- **Claude cost caching (two parts):** Anthropic **prompt caching** (required in §7) so repeat calls pay
  only for the small record-specific delta; plus an optional **AI-response cache** keyed by a hash of
  `(model + prompt + linked records)` so an identical re-draft returns the cached result instead of
  re-billing — with an explicit **"regenerate"** action to bypass it, since the model is non-deterministic
  and users edit drafts.

### 11.5 Async jobs for email
Email must never be sent on the request thread — it is slow and can fail. This becomes necessary as soon
as invites and verification exist (`workspace_invites`, signup verification, password reset).

- **Delivery:** **Amazon SES** (handles SPF/DKIM/DMARC deliverability; starts in the sandbox, then request
  production access).
- **Queue + worker:** **SQS** with a small worker (a second App Runner service or a **Lambda**), a
  **dead-letter queue** for poison messages, and **idempotent handlers** so retries never double-send. A
  pure-Python alternative is **ARQ** (asyncio-native, Redis-backed) or Celery / Dramatiq.
- **Do not** use FastAPI `BackgroundTasks` for anything that matters — it is in-process with no durability
  or retry.
- Wire SES **bounce/complaint notifications** (via SNS) back into the system to protect sender reputation.

### 11.6 Load testing
Find the breaking point before users do.

- **Tooling:** **Locust** (Python — fits the stack) or **k6**. Script realistic **weighted** journeys:
  login → list objectives → create objective → run an AI draft.
- **Test types:** **smoke** (sanity), **load** (expected concurrency), **stress** (past expected, to find
  the break point), **soak** (sustained, to surface leaks and connection exhaustion), and **spike**
  (sudden surge, to validate autoscaling and the rate limits).
- **Mock the Claude call** in load tests so runs do not cost money or hit provider limits — this exercises
  **your** queuing and limiting; test the real Claude path separately at low volume.
- **Watch:** p50/p95/p99 latency, error rate, throughput, and especially **RDS connection count** (the
  likely first bottleneck). Run against a **staging** environment sized like production, never prod, and
  set rate limits and autoscaling thresholds **below** the break point discovered.

### 11.7 Cross-cutting resilience
- **Observability:** structured logs (never secrets or full AI payloads), CloudWatch metrics + alarms,
  **X-Ray** tracing, and an error tracker such as **Sentry**.
- **Resource-exhaustion guards:** Pydantic validation on all input, a **maximum request-body size**, and
  hard **pagination caps** on list endpoints.
- **Graceful degradation:** a **timeout + circuit breaker** around the Claude call so a slow or failing
  provider does not cascade into the whole API (surface a clean "try again" to the user).
- **Cost guardrails:** per-user AI quotas (§11.1) + **AWS Budgets** alerts + the Claude usage tracking, so
  abuse shows up as an alert rather than a surprise bill.

### 11.8 Prototype minimum vs. documented scale-up
- **Implement now (prototype):** WAF rate rules + app-level tiered limits; RDS in private subnets with KMS
  + enforced TLS + Secrets Manager; secret scanning (pre-commit + CI + Push Protection) with the Claude
  key in Secrets Manager; CloudFront caching + Anthropic prompt caching; SQS + SES for invite/verification
  email; and a Locust smoke + stress run against staging.
- **Scale-up (documented; add when load/SLAs demand):** ElastiCache Redis, RDS Proxy, IAM database
  authentication, the full soak/spike suite, circuit breakers around all external calls, and multi-AZ
  everything (per §10.2).

---

## 12. Definition of Done / anti-drift checklist

Run this before every merge. If any answer is "no," stop and resolve it (or open a design change per
§0).

- [ ] The change maps onto an existing **table, endpoint, field, and rule** in the architecture
      reference (no new tables/endpoints/fields invented inline).
- [ ] **Tenancy** holds: every new query/path is workspace-scoped; negative-access tests pass.
- [ ] Core invariants respected: **company-level architecture**, **origin-as-provenance/reuse**,
      **three-altitude forecast + actuals-once**, **deliverables-as-suggestions**.
- [ ] No editable objective actuals; no deliverable auto-regeneration; AI writes nothing directly
      (only user Save persists).
- [ ] **No new npm packages** and **no unrelated refactors** snuck into this PR.
- [ ] API responses are camelCase; DB is snake_case; validation gates return structured 422s.
- [ ] Security: no secrets in code; input validated; access control centralized; nothing sensitive
      logged; AI context is lean.
- [ ] Lint, type-check, and tests are green; new rules/flows have tests.
- [ ] Docs updated if the design changed (this guide and/or the architecture reference).

**Operational hardening (§11):**
- [ ] Rate limits applied — auth endpoints tight, **`/ai/*` per-user quota enforced**, general CRUD
      capped; limited responses return `429` + `Retry-After`.
- [ ] No secrets in code; secret scanning (pre-commit + CI) is green and **Push Protection** is on; the
      Claude key and DB credentials live in **Secrets Manager**, never the frontend or repo.
- [ ] New email / notification work runs through the **async queue (SQS + worker)**, not the request
      thread; handlers are idempotent.
- [ ] Expensive or repeated reads are cached; **Anthropic prompt caching** is used; the AI quota is
      enforced and AWS Budgets alerts exist.
- [ ] New endpoints have a **body-size limit** and **pagination caps**; the Claude call has a timeout
      (and a circuit breaker at scale).
- [ ] DB access is least-privilege and workspace-scoped; RDS stays private with TLS enforced.

---

*This guide governs how the Strategic Lifecycle AI Framework is built and operated. It is intentionally
conservative about scope: the fastest way to ship a coherent system is to build exactly the model that
was designed, secure it well, host it simply, and add nothing that is not written down.*
