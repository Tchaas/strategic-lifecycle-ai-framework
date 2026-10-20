# Running onboarding locally

The owner selected local testing. This setup does not use the hosted frontend or database.
It runs PostgreSQL, FastAPI, Vite, and a separate backend email worker. Verification logic,
message creation, retries, and token validation stay in the backend. External delivery uses
an authenticated SMTP server; AWS is not required. A local inbox remains an explicit test mode.

From the repository root, after installing PostgreSQL, Python 3.12+, and Node/npm:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
npm --prefix "Build Webpage Framework" ci
python3 scripts/run_local.py --email-provider smtp
```

The dependencies are already installed in the current local environment. SMTP uses Python's
standard library; no additional email SDK is required.

- App: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:8000/docs>
- Test inbox, only in explicit local-mail mode: <http://127.0.0.1:8025>

## Configure external email

No sender or SMTP service is currently configured. Complete these steps before expecting mail
in an external inbox:

1. Establish an outgoing SMTP service and an authorized sender address. Complete the service's
   sender/domain verification and DNS requirements. This does not move account logic out of FastAPI.
2. Put the values supplied by that service in ignored `backend/.env` or the backend shell
   environment. Shell settings take precedence. Do not put credentials in chat, source control,
   frontend code, or `VITE_*` variables. Quote passwords in `.env` when they contain special characters.

   ```dotenv
   EMAIL_PROVIDER=smtp
   EMAIL_FROM=Your App <verify@your-domain.example>
   SMTP_HOST=your-mail-server.example
   SMTP_PORT=587
   SMTP_SECURITY=starttls
   SMTP_USERNAME=your-smtp-username
   SMTP_PASSWORD="your-smtp-password"
   ```

   These are placeholders, not working credentials. Use `SMTP_SECURITY=ssl` with the port
   supplied by your service (commonly 465) for implicit TLS; STARTTLS commonly uses 587.
   External SMTP always validates certificates and authenticates after encryption. Plaintext
   fallback and disabled certificate checks are not supported.
3. Start `python3 scripts/run_local.py --email-provider smtp`. Startup validates configuration,
   connects with TLS, and checks SMTP authentication without sending an email. It fails clearly
   before starting the stack if the check fails. Authentication success does not prove the
   sender is authorized or that a recipient inbox will accept mail.
4. Create an account in the app. The backend queues the verification email automatically and
   its worker sends it. Watch the verification page for queued, accepted, delayed, or failed status.
5. Check the recipient's actual inbox and spam folder, open the verification link, select
   **Verify email**, enter company/workspace information, and add at least one department.
   This received-and-used link is required evidence of external delivery.

The launcher sets `FRONTEND_BASE_URL=http://127.0.0.1:5173` for local links. Open the email link
on the same computer running the app; localhost on a phone points to the phone. For a separately
configured deployment, set `FRONTEND_BASE_URL` to the public app URL and keep both the API and
`python -m app.email_worker` running against the same database and email configuration.
The worker is a backend process, not a frontend task. No hosted rollout is authorized here.

After switching from SES or local mail, sign in and select **Resend verification email** to
queue a fresh SMTP message. Previously queued messages from another transport are not replayed.

## Explicit local-only testing

```sh
python3 scripts/run_local.py --email-provider smtp-local
```

This mode starts the test inbox at <http://127.0.0.1:8025> and uses only its loopback SMTP server.
It does not authenticate with or send to the configured external service. Messages stay on this
computer; the verification page states this plainly. Any address can be used in this mode.
It proves the local flow, not external inbox delivery. Never use this mode as a silent fallback
when external SMTP is missing or unavailable.

Departments are editable by the admin, with optional contact details and hierarchy. The final
department cannot be deleted. Members can see departments and edit other company information,
but cannot rename the workspace, manage departments, or invite people.

Ctrl-C stops the stack. Restart with the same command; workspace records persist under
`.local/onboarding/postgres`. The inbox is temporary and clears on restart. Verification links
already delivered remain valid until expiry; resend from the app if the inbox was cleared.
The generated local JWT secret and logs live under ignored `.local/onboarding`. The existing
`backend/.env` is not edited. Ports 5173, 8000, and 55439 (plus 8025 and 1025 in local-mail mode) must be available; the
launcher refuses to take over another process. The development database is `slaf_local` on
port 55439. **Do not use it for pytest**, which recreates its target database.

## Checks

Use a separate disposable database for backend checks. For example, with a separately started
test PostgreSQL instance on port 55438 and database `slaf_onboarding_test`:

```sh
cd backend
PATH="$PWD/.venv/bin:$PATH" TEST_DATABASE_URL=postgresql+psycopg://postgres@127.0.0.1:55438/slaf_onboarding_test .venv/bin/python -m pytest -q
```

SMTP protocol tests use OpenSSL to generate temporary certificates and a local TLS/authenticated
SMTP server. They exercise encryption and delivery without sending external email.

The temporary test instance used during implementation is separate from the local app and
may be stopped after testing. The launcher does not start or reset the test database.

To run the browser acceptance check against the running **smtp-local** stack:

```sh
backend/.venv/bin/python -m playwright install chromium
backend/.venv/bin/python scripts/check_local_onboarding.py
```

The check creates uniquely named local test accounts and workspaces. It exercises delivered
mail, verification, required departments, saved company information, a failed save, invitation
registration, member restrictions, refresh, returning sign-in, and session recovery during a
temporary server failure. It writes a screenshot under `.local/onboarding`.

## Email operation

Signup commits the account, hashed verification token, session, and email-outbox record
together. The separate worker sends queued mail. It retries failures up to five times with
backoff for transient failures; configuration errors, authentication/TLS failures, and permanent SMTP rejections
fail immediately with a safe error code. Failures are visible in verification status or the invitation list.
Resending is available with a cooldown. The worker deletes the message body after delivery
or final failure. No email delivery happens on the API request thread.

Delivery is at least once: if a worker stops after SMTP accepts a message but before the
database records success, a retry can deliver the same link again. Verification and invitation
acceptance are single-use, and membership creation is transactional. Do not claim exactly-once
email delivery. No verification link is returned by ordinary signup or resend responses.

The launcher honors `EMAIL_PROVIDER` (default `smtp`) and only starts the test inbox when
`smtp-local` is explicitly selected. Each message retains its transport. Old `ses`, `smtp-local`,
and `unknown` rows are not sent by an `smtp` worker. No database reset or migration is needed
for this switch. Use resend to create a message with the current transport.

SMTP 4xx responses and connection failures retry, up to five attempts. Permanent rejections,
invalid credentials, and security/configuration failures are recorded as failed. Diagnostics
contain safe categories, never provider response text, credentials, recipients, or verification
links. Successful sends retain the application's Message-ID in the existing `provider_message_id`
field; for SMTP this is a correlation identifier, not a provider receipt. A successful send
means the SMTP server accepted the message, not that the recipient received it.

If startup or delivery fails, use these categories to check backend configuration:

| Category | Check |
|---|---|
| `email_not_configured` | Sender, host, port, security mode, username, and password are present and valid. |
| `smtp_authentication_failed` | SMTP credentials and the account's SMTP access settings. |
| `smtp_tls_failed` / `smtp_security_unsupported` | Correct server, port, TLS mode, and trusted server certificate. |
| `smtp_recipient_rejected` / `smtp_message_rejected` | Sender authorization and recipient/service restrictions. |
| `smtp_temporarily_unavailable` / `delivery_connection_failed` | Service availability, connectivity, and temporary sending limits. |

Correct the service configuration, restart the stack, and request another email if the earlier
message reached final failure. No automatic verification is substituted for a failed email.
External inbox delivery remains unverified until actual SMTP settings are supplied and tested.

## Scope of this increment

This completes the local signup/verification and initial workspace/company/department journey
and the invitation path needed to verify member access. Older business pages and dashboard
sample paths remain separate work. No theme replacement, password-recovery feature, account
closure, platform console, or new role-management UI is included.

Migration `0012_onboarding` applies cleanly to a new local database and can be reversed in the
disposable test database. It does not delete existing records to satisfy new constraints:
an older database with multiple memberships per user will require explicit reconciliation
before upgrade. The local launcher uses its own new database to avoid that conflict.
