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
| `TWO_FA_ISSUER` | No (default `Business OS`) | `Business OS` | Shown in authenticator apps next to the account name. |
| `REFRESH_COOKIE_NAME` | No (default `refresh_token`) | `refresh_token` | Cookie name for the refresh token. |
| `REFRESH_COOKIE_DOMAIN` | No (blank) | — | Leave blank for same-origin deployment (the default topology — see the Module 1 README). Only set if the frontend and API are deliberately on different subdomains. |
| `REDIS_URL` | No (blank) | `redis://...` | Leave blank to use the in-memory rate-limit store (single-instance only). **Must** be set before running more than one API process — see `rate-limit.middleware.ts`. |

## Generating secrets

```bash
# JWT secrets (48 random bytes, base64)
openssl rand -base64 48

# TWO_FA_ENCRYPTION_KEY (must be exactly 32 bytes once base64-decoded)
openssl rand -base64 32
```

Never commit `.env`. It's gitignored; only `.env.example` (with placeholder values) is checked in.
