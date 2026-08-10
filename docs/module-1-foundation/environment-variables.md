# Module 1 — Environment Variables

All variables are validated at boot by `src/server/shared/config/env.ts` (Zod) — the server
refuses to start with a missing or malformed value rather than failing unpredictably later. See
[`.env.example`](../../.env.example) for a ready-to-copy template.

| Variable | Required | Example | Notes |
|---|---|---|---|
| `PORT` | No (default `5000`) | `5000` | Express listen port. |
| `NODE_ENV` | No (default `development`) | `production` | `development` \| `test` \| `production`. Gates the dev-only console `EmailService` and pino's pretty-printer. |
| `CORS_ORIGIN` | Yes | `http://localhost:5173` | Exact origin allowed with credentials. Must match the frontend's origin — no wildcard, since credentials mode forbids `*`. |
| `DATABASE_URL` | Yes | `postgresql://business_os:...@localhost:5432/business_os?schema=public` | Prisma/Postgres connection string. |
| `JWT_ACCESS_SECRET` | Yes (≥32 chars) | — | Signs access tokens and the short-lived 2FA challenge token. Generate with `openssl rand -base64 48`. |
| `JWT_ACCESS_TTL` | No (default `15m`) | `15m` | Access token lifetime. |
| `JWT_REFRESH_TTL` | No (default `7d`) | `7d` | Refresh token lifetime (normal login). |
| `JWT_REFRESH_TTL_REMEMBER_ME` | No (default `30d`) | `30d` | Refresh token lifetime when `rememberMe: true`. |
| `TWO_FA_ENCRYPTION_KEY` | Yes | `openssl rand -base64 32` output | AES-256-GCM key (must decode to exactly 32 bytes) used to encrypt TOTP secrets at rest. |
| `TWO_FA_ISSUER` | No (default `Grow More`) | `Grow More` | Shown in authenticator apps next to the account name. |
| `REFRESH_COOKIE_NAME` | No (default `refresh_token`) | `refresh_token` | Cookie name for the refresh token. |
| `REFRESH_COOKIE_DOMAIN` | No (blank) | — | Leave blank for same-origin deployment (the default topology — see the Module 1 README). Only set if the frontend and API are deliberately on different subdomains. |
| `REDIS_URL` | No (blank) | `redis://...` | Leave blank to use the in-memory rate-limit store (single-instance only). **Must** be set before running more than one API process — see `rate-limit.middleware.ts`. |
| `GOOGLE_CLIENT_ID` | Production only | `123-abc.apps.googleusercontent.com` | OAuth 2.0 client ID for the Gmail API. All five `GOOGLE_*` vars must be set together — a partial set fails startup validation on purpose. Blank in dev falls back to the console `EmailService`. See [`gmail-api-setup.md`](./gmail-api-setup.md). |
| `GOOGLE_CLIENT_SECRET` | Production only | — | OAuth 2.0 client secret. Backend-only, never sent to the frontend. |
| `GOOGLE_REFRESH_TOKEN` | Production only | — | Long-lived token obtained once via the OAuth consent flow; the app exchanges it for short-lived access tokens automatically on every send. |
| `GOOGLE_REDIRECT_URI` | Production only | `https://developers.google.com/oauthplayground` | Must exactly match a redirect URI registered on the OAuth client in Google Cloud Console. |
| `GOOGLE_SENDER_EMAIL` | Production only | `no-reply@yourcompany.com` | The Gmail/Workspace mailbox that owns the refresh token — every email is sent `From:` this address. |

## Generating secrets

```bash
# JWT secrets (48 random bytes, base64)
openssl rand -base64 48

# TWO_FA_ENCRYPTION_KEY (must be exactly 32 bytes once base64-decoded)
openssl rand -base64 32
```

Never commit `.env`. It's gitignored; only `.env.example` (with placeholder values) is checked in.
