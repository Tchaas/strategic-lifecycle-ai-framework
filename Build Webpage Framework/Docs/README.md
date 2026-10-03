# Project Documents

Read [V3.4_GAP_ANALYSIS_AND_PLAN.md](V3.4_GAP_ANALYSIS_AND_PLAN.md) first.
It contains the current decisions, build order, page records, and checks for completion.
The owner's latest instructions take priority over all documents.

## Current work

The application already exists. Extend the backend and existing React UI.
Accounts and permissions come first, followed by complete pages in the user's journey.
Each page connects to the server and saves real records as it is built.

There are no customers or real database records to preserve. Database work uses a clean,
repeatable setup. Planning does not execute a reset.

Preserve the current UI appearance and structure. Add the required pages using the existing
controls. Visual changes need explicit approval; a different mockup is not approval.

No application changes are authorized by this documentation update.

## Where to look

| File | Purpose |
|---|---|
| [V3.4_GAP_ANALYSIS_AND_PLAN.md](V3.4_GAP_ANALYSIS_AND_PLAN.md) | Current decisions, ordered work, page checklist, open questions, and earlier gap inventory. |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Current working rules followed by clearly marked earlier implementation material. |
| [DEVIATIONS.md](DEVIATIONS.md) | Earlier decisions, with a table explaining which v3.4 rules replace them. |
| [../../CLAUDE.md](../../CLAUDE.md) | Repository instructions for implementation sessions. |
| [../../AGENTS.md](../../AGENTS.md) | Agent instructions pointing to the same current plan. |
| [Strategic_Lifecycle_AI_Framework_Architecture.html](Strategic_Lifecycle_AI_Framework_Architecture.html) | Earlier design reference; not the full v3.4 specification. |
| [Strategic_Lifecycle_Wireframe.html](Strategic_Lifecycle_Wireframe.html) | Earlier prototype; its sample records and flow do not define current application behavior. |

The running frontend starts at `../src/main.tsx`, which renders
`../src/app/WireframeApp.tsx`. Its existing appearance is the starting point for new pages.

## Missing source details

Record the accessible location and version of the original v3.4 PDF and the owner's additional
UI in the plan before using them to decide details found only in those sources.
Do not assume the earlier HTML files are the new PDF or the supplied UI.

## Working agreement

For each page, record who uses it, what it shows, its actions, saved fields, permission rules,
errors, and the next page. Complete and verify the page, server operations, and saved records
together. No sample-data fallback and no separate connection project at the end.

Stripe is out of scope. AI credit charging is deferred. Real email remains required.
AI suggestions may be stored, but business records change only when the user explicitly saves.
No old table count, deadline, theme proposal, or historical exception overrides the current plan.

When a requirement changes, update the plan and affected instructions before implementation.
