# Gmail API (OAuth 2.0) Email Setup

Every outbound email (invites, password resets, welcome emails, leave/payroll/HR notifications,
the bootstrap admin's activation-adjacent flows, etc.) goes through one interface,
`EmailService.send()` (`src/server/shared/email/email.service.ts`). In production that interface
is backed by `GmailEmailService`, which sends through the Gmail API using OAuth 2.0 — no SMTP, no
App Password, no `nodemailer`. Locally, if the five `GOOGLE_*` env vars below aren't set, it falls
back to `ConsoleEmailService`, which prints the email instead of sending it.

Nothing about *what* gets sent changed — every template in `email.templates.ts` is untouched. This
only replaces *how* the message leaves the server.

## 1. Google Cloud configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (or reuse
   an existing one) — e.g. "Grow More HR Portal".
2. **Enable the Gmail API**: APIs & Services → Library → search "Gmail API" → Enable.
3. **Configure the OAuth consent screen**: APIs & Services → OAuth consent screen.
   - User type: **Internal** if the sending mailbox is a Google Workspace account on your own
     domain (simplest — no verification, no test-user limits). **External** if it's a personal
     `@gmail.com` address.
   - Fill in the app name, support email, and developer contact email.
   - Scopes: add `https://www.googleapis.com/auth/gmail.send` (see §3 below — this is the only
     scope this integration needs).
   - If **External**: add the sending mailbox's own address under **Test users** while you
     generate the refresh token (§5). See the note on publishing status in §5 — a "Testing" app's
     refresh tokens expire after 7 days, which is not what you want for a production system.
4. **Create OAuth 2.0 credentials**: APIs & Services → Credentials → Create Credentials → OAuth
   client ID → Application type **Web application**.
   - Add an **Authorized redirect URI**. The simplest option, requiring no code of your own, is
     Google's OAuth Playground: `https://developers.google.com/oauthplayground`. This becomes your
     `GOOGLE_REDIRECT_URI` value.
   - Save. You'll get a **Client ID** and **Client secret** — these become `GOOGLE_CLIENT_ID` and
     `GOOGLE_CLIENT_SECRET`.

## 2. What each env var is

| Variable | Where it comes from |
|---|---|
| `GOOGLE_CLIENT_ID` | The OAuth client created in step 4 above. |
| `GOOGLE_CLIENT_SECRET` | Same OAuth client. Backend-only — never sent to the frontend, never logged. |
| `GOOGLE_REDIRECT_URI` | Must exactly match an Authorized redirect URI on that OAuth client (e.g. the OAuth Playground URL above). |
| `GOOGLE_REFRESH_TOKEN` | Generated once via the OAuth consent flow (§5) — long-lived; the app exchanges it for a short-lived access token automatically on every send, via `googleapis`' `OAuth2Client`. There is no manual refresh loop in this codebase. |
| `GOOGLE_SENDER_EMAIL` | The mailbox that owns the refresh token. Every email is sent `From:` this address. |

All five are validated together at server startup (`src/server/shared/config/env.ts`): if any one
of them is set, all five must be — a partial configuration fails startup immediately with a clear
error rather than silently misbehaving later. If none are set, the server falls back to
`ConsoleEmailService` (and that one refuses to run in production — see §8).

## 3. Gmail API scope used

```
https://www.googleapis.com/auth/gmail.send
```

This is the minimum scope for sending mail via the Gmail API — it does **not** grant read, search,
delete, or any other mailbox access. Least-privilege by design: nothing in this integration needs
to read the mailbox.

## 4. OAuth setup summary

The flow this app relies on is the standard OAuth 2.0 **authorization code → refresh token**
exchange, done **once**, by hand, outside the running app:

1. You (the mailbox owner) authorize the OAuth client to send mail as you, via a Google-hosted
   consent screen.
2. Google returns an authorization code.
3. That code is exchanged for an access token + a **refresh token**.
4. Only the refresh token is saved (as `GOOGLE_REFRESH_TOKEN`) — the app uses it to mint fresh
   access tokens automatically for every send, for as long as the refresh token stays valid.

## 5. How to generate the Refresh Token (OAuth Playground method)

This is the easiest way — no script, no local server, no code:

1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground).
2. Click the gear icon (⚙, top right) → check **"Use your own OAuth credentials"** → paste in
   your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from step 4 above. Close the settings panel.
3. In the left panel ("Step 1 — Select & authorize APIs"), find **Gmail API v1** and select the
   `https://www.googleapis.com/auth/gmail.send` scope (or paste that URL directly into the "Input
   your own scopes" box).
4. Click **Authorize APIs**. You'll be sent to a real Google consent screen — sign in as the
   mailbox you want to send from (this must be the same address you added as a test user in §1 if
   your app is in "Testing" status). Approve.
5. Back on the Playground, **Step 2 — Exchange authorization code for tokens**: click **Exchange
   authorization code for tokens**.
6. You'll now see a **Refresh token** field. That value is `GOOGLE_REFRESH_TOKEN`.

**Important — publishing status affects refresh token lifetime.** If your OAuth consent screen is
still in **Testing** status, Google expires refresh tokens after 7 days, which will silently break
production email sending a week after you set it up. Before relying on this in production, go back
to **OAuth consent screen** and click **Publish App** (moving it to "In production"). For a single
internal `gmail.send`-scope integration like this, Google does not require its manual verification
review to do this — you may see an "unverified app" warning when *you* click through the consent
screen once during setup, which is expected and fine to accept, since you are the app's own owner.

## 6. Render environment variables

In the Render dashboard → your backend service → **Environment**, add:

```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REFRESH_TOKEN=<from the OAuth Playground exchange>
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
GOOGLE_SENDER_EMAIL=<the mailbox address you authorized in step 4 of §5>
```

Saving env var changes triggers a redeploy/restart on Render automatically. After it's back up,
use the email-admin endpoints (§9) or trigger a real flow (e.g. an invite) to confirm delivery.

Double-check for trailing whitespace after pasting — a stray space or newline in
`GOOGLE_CLIENT_SECRET` or `GOOGLE_REFRESH_TOKEN` will cause every send to fail with a 401 from
Gmail, and the error is easy to mistake for a wrong-value problem rather than a formatting one.

## 7. Local development setup

You don't need any of this to develop locally. With all five `GOOGLE_*` vars left blank in your
`.env`, `emailService` resolves to `ConsoleEmailService`, which prints each email's recipient,
subject, and body to the server console instead of sending it — every invite/reset/notification
flow is still fully testable end-to-end, you just read the email in your terminal instead of an
inbox.

If you specifically want to test real Gmail sending locally, follow §1–§5 above and set the same
five variables in your local `.env` — the code path is identical between local and production, the
only difference is which env vars are present.

## 8. Production deployment guide

1. Complete §1–§5 once, using the real production sending mailbox.
2. Set all five variables in Render (§6).
3. Deploy. On boot, `src/server/shared/email/email.service.ts` checks whether all five are
   present; if so it constructs `GmailEmailService`, otherwise `ConsoleEmailService` — which
   **throws** on any send attempt in production rather than silently dropping a security-critical
   email (invite links, password resets). A misconfigured production deployment fails loudly, not
   quietly.
4. Every send attempt (success or failure) is written to the `EmailLog` table, visible via the
   existing email-admin endpoints (§9). A transient Gmail failure (429 rate limit, 5xx) is retried
   in-process up to twice with backoff before being logged as `FAILED`; anything logged `FAILED` is
   automatically retried again later by the hourly `retryFailedEmails` job
   (`src/server/jobs/retry-failed-emails.job.ts`) — this part of the architecture is unchanged from
   before.

## 9. Testing email delivery

With the app running (locally against Console, or deployed against real Gmail) and logged in as a
`SUPER_ADMIN` or `ADMIN`, use the existing email-admin endpoints — these were not changed by this
migration, they work against whichever `EmailService` is active:

- `GET /api/v1/email-admin/templates/:type/preview` — renders a sample of a given template
  (`invite` | `password_reset` | `welcome` | `interview_scheduled` | `notification`) without
  sending anything.
- `POST /api/v1/email-admin/test` — `{ "type": "invite", "to": "you@example.com" }` — actually
  sends that sample template to the given address, prefixed `[Test]`, and writes a real `EmailLog`
  row.
- `GET /api/v1/email-admin/logs` — paginated `EmailLog` history (status, template, error) for the
  caller's tenant.

To exercise the real business flows end-to-end rather than the test-send endpoint: invite a user
(`POST /users/invite`), create a company (`POST /tenants`, which invites its first Admin), or
trigger a password reset (`POST /auth/password-reset/request`) — each of these calls
`emailService.send()` exactly as it did before this migration; only the transport underneath
changed.

## Security notes

- `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN` are read only from `process.env` on the
  backend and are never included in any API response, never sent to the frontend, and never
  written to logs — error messages describe *what kind* of Gmail failure occurred (e.g.
  "authentication failed (401)") without ever interpolating the secret or token values themselves.
- An expired/revoked refresh token surfaces as a Gmail 401, logged as a `FAILED` EmailLog row with
  a message telling you to re-authorize (repeat §5) and update `GOOGLE_REFRESH_TOKEN` — it does
  not crash the server or block the business action that triggered the email.
- A Gmail API quota or permission error (403) and a rate limit (429) are each classified and
  logged distinctly; 429/5xx errors get an automatic short in-process retry before falling back to
  the hourly retry job.
