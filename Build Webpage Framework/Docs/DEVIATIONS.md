# Earlier Decisions and V3.4 Replacements

**Updated:** 2026-10-03.
[V3.4_GAP_ANALYSIS_AND_PLAN.md](V3.4_GAP_ANALYSIS_AND_PLAN.md) governs current work,
subject to the owner's latest instructions. The entries below preserve the history of Stages
5-16; they are not permission to restore old behavior.

## Rules replaced by v3.4

| Earlier entry | Current instruction |
|---|---|
| #4: unique membership only within a workspace | Enforce at most one workspace membership per account across workspaces. |
| #5: sign-up creates a workspace | Superseded: ordinary sign-up creates an account only; verification and workspace setup follow. |
| #10: old invitation delivery and error names | Extend for real email, role assignment, delivery outcomes, and the v3.4 invitation journey; use the agreed error names. |
| #11: user deletion can cascade to authored records | Superseded for user references: preserve authored history using the v3.4 nullable-reference rules. |
| #13, #16, #19, #21: limits on numbers of business records | The cap-related portions are superseded. Remove structural caps; preserve unrelated rules unless v3.4 changes them. |
| #21: missing company architecture during normal setup | Workspace creation also creates its required architecture record; update affected checks and tests. |
| #24: AI described as stateless | Suggestions and usage may be stored. Business records still require an explicit user Save. |
| #29: list response format | Retained: `{items, total, limit, offset}`. |
| #9: outsiders receive 404, unauthorized members receive 403 | Retained; verify it on the server for each action. |

Other entries must be checked against v3.4 before reuse. A.8 of the plan records unresolved
keep/drop questions about extra routes. A recommendation there is not a settled decision.
The earlier cardinality-error convention below is historical and ends with removal of the caps.

The owner's 2026-10-03 decisions also supersede any earlier migration-first, dashboard-first,
theme-replacement, sample-data-first, or connect-the-frontend-later instruction. Follow the
plan's steps and page-completion checks.

## Historical Entries

| # | Stage | PR | Type | Decision | Rationale |
|---|---|---|---|---|---|
| 1 | 5 | #1 | Interpretation | Migration order runs Architecture before Strategy (reference lists Strategy first) | Strategy junction tables FK into architecture tables; FK-safe ordering |
| 2 | 5 | #1 | Interpretation | `business_impacts.linked_lean_business_case_id` added by ALTER in the business-case migration, not at table creation | Forward FK into a not-yet-created table |
| 3 | 5 | #1 | Interpretation | Audit-column exceptions: `users` (no `created_by_user_id` — self-registration), `refresh_tokens` (`created_at` only — system table) | The blanket audit convention is unsatisfiable/redundant on these two |
| 4 | 5 | #1 | Addition | `UNIQUE (workspace_id, user_id)` on `workspace_members` | Implied by the model; made explicit to prevent duplicate membership |
| 5 | 6 | #1 | Deviation | `POST /auth/signup` provisions user + first workspace + admin member (contract row listed `users` only) | IMPLEMENTATION.md §1 vs. contract conflict; §1 chosen |
| 6 | 6 | #1 | Addition | Google first-time sign-in creates the user only — no workspace | No `workspaceName` exists at Google sign-in; Account & Setup creates it via `POST /workspaces` |
| 7 | 6 | #1 | Interpretation | Refresh tokens are opaque random strings (not JWTs), SHA-256-hashed at rest; reuse of a revoked token revokes the whole family | Strictest reading of "store hash, never the token"; standard theft mitigation |
| 8 | 7 | #1 | Interpretation | Invite acceptance requires strict email match (citext) — possession of the token is insufficient | Invites are per-address in the schema; workspaces are the tenant boundary |
| 9 | 7 | #1 | Interpretation | 404-vs-403 boundary: non-members get byte-identical 404s; members lacking privilege get truthful 403 `admin_required` | The tenancy posture protects the boundary from outsiders; insiders already know the workspace exists |
| 10 | 7 | #1 | Addition | Invite tokens returned once at creation; never in list responses; guardrails `last_admin`, `already_member`, `invite_exists` | Token-harvest prevention; orphaned-workspace prevention |
| 11 | 8 | #2 | **Correction** | FK semantics rule: nullable FKs are references (`ON DELETE SET NULL`), NOT NULL FKs are ownership (`CASCADE`). Migration 0010 flipped nine FKs | Stage 5's blanket CASCADE made org-metadata deletion destroy architecture data |
| 12 | 8 | #2 | Interpretation | Department deletion promotes children to root; department writes admin-only, reads member | Org restructuring should not be a data-loss event; consistent with workspace-profile gating |
| 13 | 9 | #3 | Interpretation | Architecture content is member-writable (collaborative); `origin` is server-stamped, never client-writable; caps count all statuses | Working material vs. tenant settings; provenance trustworthiness |
| 14 | 9 | #3 | Interpretation | Contract fidelity kept: no DELETE on the architecture singleton, no GET-single capability | Deliberate omissions in the reference honored |
| 15 | 11 | #5 | Deviation | Unlink (DELETE) endpoints added for objective↔stream and objective↔capability links (contract lists POST only) | Irreversible optional selection is a UX trap; link/unlink annotation used elsewhere suggests omission |
| 16 | 11 | #5 | Interpretation | Max-3 objectives counts **non-archived** only; archiving frees a slot | A lifetime cap would defeat archive-as-parking |
| 17 | 11 | #5 | Interpretation | Financials arithmetic pinned: forecast = non-archived case sums; actuals from implementation rows; variance = actuals − forecast; `byValueStream` from `implementation_value_streams` | Reference names inputs but not arithmetic |
| 18 | 12 | #6 | Interpretation | Dual-PATCH design (C): field PATCH carries forward transitions; `/status` handles archive/reactivate; **gate maintenance** — gate fields cannot be blanked while active | Most literal reading of "field edits (active-gate enforced)" |
| 19 | 12 | #6 | Addition | Gate maintenance backported to strategic objectives; `objective_archived` guard (archived objectives accept no new cases); max-10 counts non-archived | Lifecycle parity; archive-as-parking consistency |
| 20 | 13 | #7 | Deviation | Eight discovery-context creation endpoints (contract lists link-existing only) implementing the roll-down with server-stamped `origin='discovery'` | Only server-side path that stamps discovery provenance without making `origin` client-writable |
| 21 | 13 | #7 | Addition | `architecture_required` guard on all non-BA roll-down creates; caps count across both origins | Every architecture table FKs the singleton; caps are per-architecture, not per-entry-point |
| 22 | 14 | #8 | Deviation | Requirements DELETE added (contract omits the row) | Highest-churn artifact; parent features already cascade-delete them |
| 23 | 14 | #8 | Deviation | Deliverables deletable only while `source='suggested'` (contract has no DELETE) | Drafts are disposable; finalized deliverables are permanent governance record |
| 24 | 14 | #8 | Interpretation | Deliverable `source` settable on create (default `suggested`); finalization one-way; content editable after finalization; same-type duplicates permitted | Stateless AI layer means all persistence flows through these endpoints; "all become user-editable" |
| 25 | 14 | #8 | Addition | `case_archived` guard on feature/deliverable creation | Stage 12 pattern one level down |
| 26 | 15 | #10 | Interpretation | `actual_cost`/`actual_value` are server-maintained sums of allocations, never client-writable; null with zero allocation rows | Pinned by the contract's PATCH note ("status / dates / notes") + "entered ONCE, per value stream" |
| 27 | 15 | #10 | Deviation | Allocation DELETE added (contract lists POST/PATCH only) | Misallocations must be removable, not merely zeroable |
| 28 | 15 | #10 | Interpretation | Any workspace value stream may receive an allocation (not restricted to case-linked streams) | Flexibility chosen over footprint enforcement |
| 29 | 16 | #11 | **Deviation (largest)** | Pagination envelope `{items, total, limit, offset}` with `?limit`/`?offset` on **every** GET-list endpoint (reference returns bare arrays) | Unbounded lists were a DoS vector; uniform shape chosen over selective pagination |
| 30 | 16 | #11 | Addition | Per-IP in-memory rate limiting on the five brute-force surfaces (incl. invite-accept token oracle); login timing equalization; 1 MB body limit; `pip-audit` gate | IMPLEMENTATION.md §8's deferred hardening cashed in |

## Standing conventions established during implementation (not deviations)

- **`ApiModel`** camelCase base and the structured **error envelope** (`{error: {code, message,
  details?}}`) — Stage 6, imported unchanged by every later stage.
- **Tenancy dependencies** `get_workspace_member` / `require_workspace_admin` — Stage 7.
- **Shared lifecycle helper** (state machine + gate evaluator), configured per resource —
  Stage 12; serves objectives, cases, discovery, features, requirements, deliverables.
- **Cardinality error shape**: 409 `cardinality_limit` with `details: {limit, current}` — Stage 9.
- **Origin parameter** on architecture creation services (default `'architecture'`) — Stage 13.
- **Pagination helper** and **rate limiter** as single shared implementations — Stage 16.

## Frontend wiring note

Entry 29 (pagination) changes every list response shape relative to the reference the frontend
mocks were built against. Wiring work must reshape list consumption once, uniformly, to the
envelope.
