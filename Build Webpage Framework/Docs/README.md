# Strategic Lifecycle AI Framework — Source of Truth

Canonical reference for the web app. These documents define the system end to end —
*what* it is (data, API, rules, UI) and *how* it is built, secured, and hosted.
Build against them. If code and these documents disagree, these documents win.

Suggested repo location: `docs/` (commit them together).

---

## Documents

### `IMPLEMENTATION.md` — how we build, secure, and host it (read first)
The engineering guardrail. Pins the **scope boundary** (to prevent code/feature drift),
software best practices, **security & data protection**, the schema/API conventions, the
**AWS hosting** plan (cost-optimized now, with a documented path to scale), **operational
hardening & abuse prevention** (rate limiting, DB security, secret handling, caching, async
email, load testing), and the public **landing page + research-paper download**. Ends with a
Definition-of-Done / anti-drift checklist to run before every merge.

### `Strategic_Lifecycle_AI_Framework_Architecture.html` — data · API · schema · rules
The single reference to verify before the backend is scaffolded.

- **Three diagrams:** entity-relationship (structure), AI-assistance flow (how AI adds
  detail without adding tables), and origin & reuse (how the same architecture is built
  from either the strategic phase or discovery, and reused across objectives).
- **Schema — 33 tables** (22 entities + 11 link tables): every column, type, foreign key,
  and enum, with the `created_by_user_id` / `created_at` / `updated_at` convention noted.
- **API — 90 endpoints** across 14 groups, including 4 stateless `/ai/*` endpoints
  (`/ai/draft`, `/ai/refine`, `/ai/suggest-links`, `/ai/usage`).
- **40 business rules** in 9 categories: tenancy & structure, cardinality, traceability
  spine, status lifecycles, validation gates, financial model, deliverables & governance,
  auth, and AI assistance.

### `Strategic_Lifecycle_Wireframe.html` — navigable UI prototype
- 20 pages across **Public Site** (the landing/overview), **Account & Setup**,
  **Phase 1 · Strategy**, **Phase 2 · Delivery**, and the **AI layer**.
- **Landing page** (public surface): project overview, lifecycle, AI-with-human-oversight,
  enterprise scenarios, governance, and the **research-paper download** — a public static
  PDF with no auth and no new tables or endpoints.
- "Show business rules" toggle overlays each rule where it governs a screen.
- Discovery page includes the guided **roll-down builder** (impacted areas → architecture
  → value streams → key activities → supporting components), each tagged by origin.
- Worked example throughout: FedEx Network 2.0.

---

## Invariants the build must honor

- **Tenancy.** Workspace = company profile = tenant boundary. Every table is
  workspace-scoped via `workspace_id`.
- **Business Architecture is company-level** — exactly one per workspace, shared across all
  objectives and cases. Optional for a new venture (it can be built as the company goes).
- **Origin is provenance, not ownership.** Architecture components carry
  `origin = architecture | discovery`. Either way they are workspace-scoped — never tied to
  the discovery or case that created them — and therefore reusable by any future objective.
  Reuse links to the existing row; it does not copy.
- **Two entry points, one model.** The architecture can be established from the strategic
  phase or from discovery (triggered by identifying impacted business areas). Same tables,
  same roll-down: architecture → value streams → key activities, with capabilities /
  processes / personas / information concepts / impacts hanging off the architecture.
- **Forecast at three altitudes** (objective → case → discovery). **Actuals entered once**,
  at implementation, per value stream (`implementation_value_streams.allocated_cost/value`).
  Objective-level actuals are **computed**, never stored.
- **Deliverables are suggestions** (`suggested → user_finalized`): the system seeds them from
  traceability data, a human edits, then saves as final. No auto-regeneration.
- **AI layer is stateless and adds no tables.** It is built on the **Claude API**, backend-mediated
  (the key stays server-side), every call is user-triggered (nothing fires on typing), one structured call
  drafts a whole component, and a cheaper model handles routine drafting. Suggestions live in
  the browser until the user saves through the normal entity endpoints — which is the same
  governance gate as deliverables.
- **Traceability spine.** `case → feature → capability → value stream / key activity` is the
  relationship every link table exists to preserve.
- **Two surfaces, scope-neutral additions.** The public landing page reads no tenant data, and
  the research-paper download is a public static PDF — neither adds a table nor an authenticated
  endpoint. New features should follow the same discipline: add nothing that isn't written down.

---

## Status & next step

Design is settled and verified against these documents (counts and relationships checked),
and `IMPLEMENTATION.md` now governs how the build proceeds (scope, security, hosting).

**Next:** generate the SQL DDL from this schema and hand it to Claude Code to scaffold the
FastAPI backend, following `IMPLEMENTATION.md`. The frontend UI shells are shaped to these
API contracts (camelCase JSON, snake_case Postgres) and wire to the backend after it exists.
