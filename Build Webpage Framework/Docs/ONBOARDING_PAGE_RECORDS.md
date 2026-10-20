# Initial onboarding page records

Updated 2026-10-13. These records implement §0.0 and B.1 of
[the governing plan](V3.4_GAP_ANALYSIS_AND_PLAN.md), not a separate roadmap.
Sources: the owner's current conversation, the plan, and the running
`src/app/WireframeApp.tsx`. No uninspected PDF or mockup is used as a requirement.

## Scope and delivery

### Approved SMTP correction (2026-10-13)

The owner approved backend-managed verification using authenticated SMTP instead of AWS.
This supersedes SES requirements below, which are retained as historical evidence.
Keep account creation and the email outbox transactional, retain the separate backend worker,
and preserve verification, resend cooldowns, provider isolation, and required workspace setup.
External SMTP must use STARTTLS or implicit TLS with certificate validation and authentication.
Credentials remain in backend environment configuration; diagnostics and frontend responses
must never expose credentials, message bodies, or verification tokens.
Preflight checks configuration and SMTP authentication without sending email. The launcher
starts the API and worker together. Local test mail still requires explicit selection.
Temporary failures retry; configuration/authentication and permanent SMTP rejections fail
truthfully. SMTP acceptance is not confirmed inbox delivery. Old SES/local/unknown queued
messages are not replayed through the new transport; users request a fresh verification email.
Retain existing frontend structure and status polling. No sender or SMTP service is configured;
external delivery requires that setup and an actual received and used verification link.
Required checks: SMTP TLS/authentication, safe failure handling, retry/restart persistence,
resend and token expiry/reuse, transport isolation, frontend build, and local browser journey.

### SMTP implementation evidence (2026-10-13)

**Owner acceptance clarification:** the feature remains incomplete until a user creates an
account in the local app and receives and uses a verification link in their actual external
inbox. The local test inbox is automated-test infrastructure only, not the owner's live
acceptance environment. Use the same backend delivery path and mail service configuration
locally and in production; only environment-specific URLs and credentials differ. Verified
users retain verified status on returning sign-in; no requirement for a new email challenge
on every login has been established.

- Replaced the SES send path with Python SMTP in `backend/app/email_worker.py`, using
  `backend/app/services/email_transport.py` for shared validation, TLS, authentication,
  and safe error categories. Both STARTTLS and implicit TLS validate certificates and
  hostnames. Authentication precedes sending; insecure fallback is prohibited.
- `backend/app/core/config.py` defaults to `smtp`, adds SMTP security/username/password,
  and masks the password in settings representations. Removed boto3 from application
  dependency declarations; no new runtime dependency was required.
- `backend/app/email_preflight.py` checks SMTP configuration and authentication without
  sending. Its exported configuration excludes credentials. `scripts/run_local.py`
  starts the existing API/worker together, sets local verification URLs, and offers explicit
  `smtp-local` testing. The actual local `.env` was not edited.
- Preserved the saved queue, retries, provider isolation, verification/resend endpoints,
  and frontend status UI. SMTP stores the application's Message-ID as a correlation value,
  not a provider receipt. Permanent rejections/authentication/security failures stop retrying;
  transient failures retain the message for retry. A failure during connection shutdown
  does not relabel an accepted message as failed.
- Updated `backend/.env.example` and `LOCAL_ONBOARDING.md` with sender/SMTP setup, TLS modes,
  startup commands, diagnostics, and the remaining external-inbox check.
- Focused email/onboarding suite: **39 passed**. Full backend regression suite: **141 passed**,
  against a new isolated `/tmp/slaf-smtp-test-*` PostgreSQL instance on port 55438,
  database `slaf_smtp_test`. No application database reset was performed.
- Real local SMTP protocol tests passed with STARTTLS and implicit TLS, authenticated
  connections, a temporary SMTP rejection, and successful retry by a fresh worker process.
  The received token verified the account, rejected reuse, and permitted workspace creation.
  These tests establish protocol behavior, not delivery to a public mailbox.
- Existing Starlette/httpx deprecation warning remains. The test SMTP server emits a warning
  in implicit-TLS mode because its STARTTLS requirement is disabled; that test listener
  itself requires TLS from connection establishment. Production TLS checks remain enabled.
- `mypy app`: passed for **101 files**. Changed-file Ruff and Black checks and
  `git diff --check`: passed. Frontend `npm run build`: passed.
- Browser acceptance passed using installed Chrome through Playwright (bundled Chromium was
  absent), against the running app/API/database/worker/local inbox. Exercised delivered mail,
  verification, mandatory departments, saved records, failed save, invitations, member
  restrictions, refresh, returning sign-in, and session recovery. Existing screenshot:
  `.local/onboarding/browser-departments.png` (ignored).
- External-mode startup correctly fails with the missing authorized-sender configuration.
  **Incomplete:** sender and SMTP service/account configuration, real recipient receipt and
  verification. The local preview runs in explicit test-inbox mode only. No external email
  or hosted rollout was performed. The page is not externally complete under checklist B.2.

### Live-delivery and deployment gaps rechecked (2026-10-13)

- `EMAIL_FROM`, `SMTP_HOST`, `SMTP_USERNAME`, and `SMTP_PASSWORD` remain absent from the
  inspected shell and backend `.env`. No actual SMTP account or sender is configured.
  Await the owner's sender/domain and DNS-control details to establish the sending identity.
- Stopped the local test-inbox stack after the owner's clarification. Do not restart that
  mode as a substitute for the requested real-inbox acceptance test.
- `.github/workflows/web.yml` publishes the frontend and sets its API destination to
  `https://slaf-backend.onrender.com`. This workflow does not deploy the backend or its email
  worker. No worker deployment definition was found in the repository; the hosting account
  and its current service configuration have not been inspected.
- Confirm the intended hosting service and plan. Render documents that free web services
  block outbound ports 25, 465, and 587; do not assume a local SMTP success proves deployment
  compatibility. Source: <https://render.com/docs/free>, checked 2026-10-13. Paid service
  provisioning or a switch to a provider's HTTPS mail API requires a concrete hosting/service
  decision; neither has been performed or silently substituted for the agreed SMTP approach.
- Production must run and supervise the API and email worker against the same database,
  with consistent mail configuration and public verification URLs. Confirm worker restart
  behavior and delivery-failure visibility in the selected hosting environment before rollout.
- Required next evidence: real sender authorization and service access, successful external
  SMTP preflight from the local app environment, automatic signup email received in a real
  inbox, successful single-use verification and setup, and failure/resend checks using that
  same delivery path. Production rollout remains unperformed and is not implied by a web
  frontend push or local protocol tests.

### Earlier delivery implementation (2026-10-06)

Email-delivery correction (2026-10-06): the owner expects verification messages in users'
external inboxes while the app runs locally. The launcher must honor SES configuration;
local SMTP must require explicit selection. Record the provider per queued message so a
provider switch cannot send old test mail externally or relabel earlier local delivery.
Expose honest verification status and safe failure categories, and retain provider acceptance
IDs for diagnosis. A successful SES API call is provider acceptance, not confirmed inbox
delivery. External completion still requires an actual recipient check. No hosted deployment
is needed for this work.

Work on `feat/workspace-onboarding`. Keep each account-flow change together with its client,
server contract, storage, and checks. Verify existing behavior first on an isolated local
database; existing pytest fixtures downgrade and recreate their database. Never point them
at the running application's database. The owner selected local testing; hosted rollout is
out of scope. The current frontend workflow publishes pushes to `main` automatically.

Keep current HUD controls and layout. No theme changes, dashboard rebuild, business-page
changes, role-management expansion, or account-closure work belongs in this increment.
Local operation is documented in [LOCAL_ONBOARDING.md](LOCAL_ONBOARDING.md). The default local
test-inbox recommendation was selected after allowing time for feedback. It uses explicit
local SMTP delivery, not automatic email verification. External SES delivery remains unverified.
That earlier local-only default is superseded by the email-delivery correction above: SES
configuration is honored, and the running app remains explicitly in test-inbox mode only
until the sender and AWS access are supplied.

The implementation adds hashed verification tokens and a durable PostgreSQL email outbox with
a separate worker. Workspace setup completion is saved only after the mandatory department
exists. These storage changes support the agreed journey; no additional business feature is
introduced. The stored membership role is `admin` or `member`; the existing `isAdmin` API field
is derived from it to avoid breaking older consumers, not a second stored permission flag.
Invitation delivery status and resend are included so mail failure is recoverable.

## Permissions used by these pages

| Action | Creator/admin | Invited member | Outsider |
|---|---|---|---|
| Read company information and departments | Yes | Yes | No |
| Change workspace name | Yes | No | No |
| Edit other company-profile fields | Yes | Yes | No |
| Add/edit/delete/reparent departments | Yes, retaining at least one | No | No |
| Invite another person | Yes | No | No |

Require verified email for admission. Enforce permissions on the server, including attempts
to rename through an otherwise permitted profile update. Outsiders receive 404 for workspace
records; members attempting admin actions receive 403. No client-supplied role grants access.
At most one workspace membership per account. Platform operators are outside this scope.

## Signup, confirmation, and returning sign-in

- **Source/entry:** extend `AuthPage`; signed-out creator enters full name, email, password.
  Move workspace information to setup. Reuse the current form and error controls.
- **Actions/storage:** signup saves an unverified account without a workspace; queue real
  confirmation email through SES. A pending page offers resend and sign-out. Expiring,
  single-use verification marks the account verified; automatically continue to workspace
  setup without manual approval. Store verification secrets safely and never log them.
- **Returning user:** restore identity from the server; unverified accounts return to pending,
  verified workspace-less creators to setup, and admitted members to their saved workspace.
  Preserve an invitation destination. Refresh/Back must not bypass verification or setup.
- **Failures:** invalid input, duplicate signup, bad password, unavailable email delivery,
  throttled resend, invalid/expired/used links, and failed session restoration show truthful
  errors and recovery actions. Do not treat a network failure as evidence of no workspace.
- **Proof required:** actual delivered email, link use, retry/resend, sign-out/in, browser
  refresh, direct server bypass attempts, and regression checks of current authentication.
- **Status:** implemented and exercised with the local SMTP inbox; external SES delivery unverified.

## Workspace and company setup

- **Source/entry:** extend the current Company Profile controls; verified creator without
  membership arrives here immediately after confirmation.
- **Visible fields:** workspace name (required); existing legal name, business unit,
  description, industry, operating model, business model, primary customers/products,
  strategic context, company size, headquarters region, website, logo URL, and annual revenue
  remain optional. All reads use saved records, never sample company or team values.
- **Actions/storage:** explicitly save workspace, creator/admin membership, and the starting
  architecture in one transaction. Continue to mandatory departments. Save profile edits
  through the real server. Repeated submissions must not produce multiple workspaces.
- **Recovery:** incomplete department setup resumes on return; saved company information is
  retained. Completing workspace creation alone does not mark onboarding complete.
- **Permissions/failures:** use the table above. Reject unverified creation, a second membership,
  blank name, forbidden field changes, and stale/failed saves without reporting success.
- **Proof required:** transaction rollback, concurrent/repeated creation, re-login/resume,
  saved profile edits, mixed-field unauthorized rename, and cross-workspace isolation.
- **Status:** implemented; local browser and server checks passed.

## Required departments

- **Source/entry:** extend `DepartmentsPage` using current form/list controls. Creator arrives
  from saved company setup; members have a read-only view after admission.
- **Visible fields:** name required and nonblank; optional description, parent department,
  department head, contact name/email, location, and headcount. Choices come from this
  workspace's saved departments. No lifecycle status or provenance field.
- **Actions/storage:** save one or several departments during setup; add more and edit later.
  Bind each department to the workspace's architecture. Enable setup completion only after
  at least one department exists, enforcing this on the server as well as in the UI.
- **Deletion/hierarchy:** admin may remove a department only while another remains. Serialize
  competing deletions so two requests cannot remove the final two. Existing child-to-root
  behavior remains; reject cycles and parents from another workspace.
- **Recovery/failures:** refresh and returning sign-in retain records; failed saves retain
  entered values and show errors. Empty/incomplete setup stays in setup. No sample fallback.
- **Proof required:** one and multiple departments, optional fields omitted, edits, refresh,
  last-department protection including concurrent deletion, hierarchy validation, member
  read access/write denial, and outsider denial.
- **Status:** implemented; local browser and server checks passed, including competing deletions.

## Invitation compatibility

The admin's invitation already approves admission. Use the existing v3.4 recommendation that
an addressed, valid invitation token verifies its recipient email, with strict recipient
matching, expiry, single-use acceptance, and the one-workspace check. This avoids a second
verification email. No additional approval screen is needed. Deliver actual invitation mail;
preserve the destination across registration/sign-in and do not send the member into creator
setup. Broader member management remains deferred. Verify with a second actual email account
before claiming this path complete.

## Forgotten password and password reset

Plan Step 3; plan A.3 `password_reset_tokens`, Group 3 endpoints, D.1 `reset-request` and
`reset-confirm`. Owner decisions 2026-10-20: identical request response whether or not an
account exists; a completed reset signs out every session and returns to Log In, and a
"password changed" email is sent; a Google-only account may add a password through reset.

- **Source/entry:** new `ForgotPasswordPage` (`#/forgot-password`) reached from a
  "Forgot password?" link on Log In; new `ResetPasswordPage` (`#/reset-password?token=`)
  reached only from the emailed link. Both are public and reuse the `AuthPage`/`VerifyEmailPage`
  panel, input, button, and error controls. No visual change.
- **Request:** the person enters an email. `POST /auth/password-reset/request` always answers
  `202` with the same message, "If an account exists for that email, we've sent a reset link."
  For an existing account it saves a hashed, single-use token expiring in one hour and queues
  the email through the existing outbox and worker in one transaction. A repeat request within
  the resend cooldown silently queues nothing, so the response never reveals an account.
  Rate limited per client. Unverified accounts may reset; reset does not change verification.
- **Confirm:** the person enters and repeats a new password (minimum 8 characters, as signup).
  `POST /auth/password-reset/confirm` checks the token, saves the new password hash, marks
  this and every other outstanding reset token for the account used, revokes every refresh
  token, and queues a "your password was changed" email, all in one transaction. Existing
  access tokens expire within their 15-minute lifetime. The page clears this browser's
  session and goes to Log In with a confirmation message.
- **Google-only accounts:** the reset email offers to add a password. After reset the account
  keeps Google sign-in and can also log in with email and password. Log In therefore accepts a
  password for any account that has one; a Google account without a password still receives
  "This account signs in with Google".
- **Email records:** outbox rows record their kind (`verification`, `invitation`,
  `password_reset`, `password_changed`). Verification status reads only verification mail, so
  reset messages cannot change what the confirmation-pending page reports.
- **Failures:** blank/invalid email, mismatched or short password, missing/invalid token (400),
  used token (409), expired token (410), rate limiting (429), and network failure show truthful
  errors; expired/used links offer "Request a new link". No pretend success.
- **Proof required:** automated checks for unknown/known/Google/cooldown requests, expiry,
  reuse, token supersession, session revocation, old password rejected, new password accepted,
  Google account password login, verification status isolation; frontend build; local browser
  journey through the actual mail outbox. Completion also requires an actual reset email
  received in an external inbox, which is blocked until SMTP sender setup.
- **Status:** implemented and checked locally (2026-10-20); not complete until an actual reset
  email reaches an external inbox, which needs the SMTP sender setup. Not released to slaf.dev.
- **Changed files:** `backend/migrations/versions/0014_password_reset.py`; `backend/app/models/email.py`
  and `__init__.py`; `backend/app/services/auth_service.py`, `email_service.py`, `invite_service.py`
  (outbox kind); `backend/app/schemas/auth.py`; `backend/app/api/auth.py`; `backend/app/core/config.py`
  and `.env.example` (`PASSWORD_RESET_TTL`); `backend/tests/test_password_reset.py`;
  `src/app/WireframeApp.tsx` (two pages, routes, Log In link, shared local sign-out).
- **Checks run:** full backend suite **146 passed** against a disposable test database, including
  the migration up/down and five new reset tests; `mypy app` clean (101 files); Ruff and Black
  clean on changed files; frontend `npm run build` and `git diff --check` passed. Browser, local
  stack in explicit `smtp-local` mode with a throwaway account: Log In shows "Forgot password?";
  request shows the uniform message; the worker delivered the reset email to the local inbox;
  mismatched passwords are refused; reset returns to Log In with the confirmation notice; the
  new password signs in (unverified account correctly lands on Verify your email, which still
  reports the verification message); the reused link shows "already been used" with "Request a
  new link"; the "Your password was changed" email arrived. No external email was sent.

## Verification record

- Frontend `npm run build`: passed on 2026-10-06 before application changes.
- Local backend lacked the already-declared `anthropic==0.120.2`; installed that exact version
  in `backend/.venv` to restore the baseline environment. Dependency manifests were unchanged.
- Backend baseline initially stopped at an obsolete schema assertion: 33 expected tables
  versus 35 created by existing migrations. Updated `backend/tests/test_smoke_schema.py`
  to compare migrated table names with declared model tables, reporting missing/unexpected
  names instead of pinning an obsolete count. No application behavior changed.
- Backend regression suite after that correction: **102 passed**, one existing Starlette
  test-client deprecation warning, against a newly created temporary local PostgreSQL
  database. Initial sandbox connection failures were resolved using approved escalation.
- Changed-test Ruff check and Black formatting check passed; documentation diff check passed.
- Final local backend suite: **111 passed**, one existing Starlette test-client deprecation
  warning. This includes rollback, competing workspace creation, competing final-department
  deletion, verification expiry/reuse/resend, invitation verification, member permissions,
  outsider denial, email-worker failure/retry, and invitation-delivery status/resend.
- `mypy app`: passed for all 99 backend source files. Ruff passed for changed Python files
  and local tools. Frontend `npm run build` and `git diff --check` passed.
- `scripts/check_local_onboarding.py`: passed against the actual local frontend, API,
  PostgreSQL, email worker, and SMTP inbox, including a run after restarting the stack.
  Browser checks cover signup, delivered email, verification, required setup, two departments,
  failed-save feedback with retained input, invitation registration, member restrictions,
  refresh, returning sign-in, and retry after a failed session-refresh request without losing
  the stored login token. Screenshot: ignored `.local/onboarding/browser-departments.png`.
- No hosted rollout or external SES delivery test was performed. Local SMTP delivery is
  evidence only for the local environment. Later business pages remain outside these results.

## Changed implementation areas

### Email-delivery diagnosis and correction

- Found eight local outbox rows marked `sent`. The active launcher forced `smtp-local`,
  overriding SES settings. No `EMAIL_FROM`, AWS region setting, AWS profile, or credential
  source was configured in the inspected local environment. Local testing had not proved
  external delivery.
- `scripts/run_local.py` now honors the configured mail provider and sender, defaults to SES,
  and requires an explicit `smtp-local` selection for a test inbox. `app.email_preflight`
  checks the sender, AWS access, and SES account/identity before starting a real-email stack.
  Missing sender configuration was checked to fail clearly before starting services.
- Migration `0013_email_delivery` adds provider attribution, acceptance IDs, and safe failure
  categories. It was applied additively to the local development database. Legacy records
  remain `unknown`; old local/unknown queued mail is never replayed by an SES worker.
- Verification status identifies local-only delivery versus SES acceptance, polls for updated
  status, and provides a local-inbox link only in test mode. SES acceptance is not labelled
  confirmed recipient delivery. Failures are recorded without logging message bodies or tokens.
- Checks: **117 backend tests passed** (SES SDK calls simulated, not external email delivery);
  `mypy app` passed for 100 files; changed-file Ruff, frontend build, and `git diff --check`
  passed. The browser journey passed against the running local SMTP stack, including an
  assertion that the page says no external email was sent.
- The local app was restarted with `--email-provider smtp-local` while sender/AWS setup is
  pending. No external email or hosted deployment was performed. Next required evidence:
  SES preflight with actual credentials and a verified sender, then signup/resend and
  confirmation that the intended external recipient received and used the link.

### Initial onboarding implementation

- `backend/migrations/versions/0012_onboarding.py` and matching models: verification tokens,
  durable email outbox, stored membership roles, creator reference, mandatory department
  fields/architecture binding, one-workspace membership constraint, and setup completion.
- Auth, workspace, department, invitation services/routes/schemas and shared dependencies:
  account-only signup, verification, atomic provisioning, server permissions and setup gates,
  recoverable delivery, and invitation registration/acceptance.
- `backend/app/email_worker.py`: separate worker with explicit SES or loopback SMTP transport.
- `WireframeApp.tsx` and `src/api/client.ts`: saved-data signup/setup/company/department/team
  views, invitation entry, and recovery from temporary session-service failures.
- Backend regression fixtures now use the real signup/verify/setup sequence; existing
  architecture tests use the singleton created by setup. New onboarding tests cover the
  changed account and department invariants.
- `scripts/run_local.py`, `scripts/local_mailbox.py`, `scripts/check_local_onboarding.py`,
  backend dependency declarations, and `.env.example`: repeatable local operation and checks.

The page records establish completion only for this local increment, not for all account
lifecycle features in the wider v3.4 plan. Password recovery is recorded separately above;
account closure remains later account work and is not claimed implemented by these changes.
