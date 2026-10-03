# Repository Working Instructions

Read `CLAUDE.md` and `Build Webpage Framework/Docs/V3.4_GAP_ANALYSIS_AND_PLAN.md`
before implementation. The owner's latest instructions take priority; the v3.4 plan governs
over conflicting earlier documentation, mockups, and historical deviations.

- Current authorization is documentation only until the owner requests implementation.
- No customers use the database and there is no real data to preserve. Database setup may
  be rebuilt during authorized implementation, never as an incidental planning action.
- Establish accounts, sign-in, recovery, membership, roles, and shared server permission
  checks first. Then follow the user's journey, completing each page with its actual server
  connection, saved records, and checks.
- Completed pages must not use sample-data fallback or pretend successful actions.
- Preserve the current UI style and structure. Extend existing controls for new pages.
  Visual changes require explicit owner approval.
- Record the page requirements and resolve missing rules before building the affected behavior.
  Use the v3.4 plan's page-completion checklist and record checks actually run.
- Treat older sample-based pages as incomplete until verified; a server call alone does not
  prove every part of a page uses saved data.
- Keep edits scoped to the requested work and preserve unrelated user changes.
- Explain decisions and results in plain language.
