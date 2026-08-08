# Module 1 — Deployment Guide

## Local development

There is no local database — dev and production share one Supabase Postgres project. `DATABASE_URL`
and `DIRECT_URL` in `.env` point at Supabase for everyday work against real (`public` schema) data.

### 1. Configure environment

```bash
cp .env.example .env
# then edit .env: fill in the Supabase connection strings (Project Settings → Database →
# Connection string) and generate real secrets (see environment-variables.md)
```

### 2. Install dependencies and generate the Prisma client

```bash
npm install
npm run prisma:generate
```

Migrations are applied automatically as part of `npm run build` (and on every Render deploy).
To apply them by hand instead: `npx prisma migrate deploy`.

### 3. Run the app

```bash
npm run dev   # runs the Express API (nodemon+tsx, :5000) and Vite client (:5173) together
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so the browser sees everything
as same-origin — this matches the production reverse-proxy topology and is required for the
refresh-token cookie's `sameSite=strict` setting to work correctly.

Visit `http://localhost:5173` → **Create your workspace** to sign up a tenant + first admin.

## Running tests

```bash
npm test                 # unit tests (mocked repositories, no DB required)
npm run test:client      # frontend component tests (jsdom + msw, no DB/API required)
npm run test:integration # full HTTP integration tests — REQUIRES a migrated Postgres schema
```

Integration tests truncate tables between runs, so they must **never** point at the `public`
schema — that's real (or real-shaped) data. Instead they run against an isolated `test` schema
inside the same Supabase project, addressed via a `schema=test` query param on both connection
strings:

```bash
# One-time setup — creates and migrates the isolated schema:
DATABASE_URL="<your Supabase DATABASE_URL>&schema=test" \
DIRECT_URL="<your Supabase DIRECT_URL>&schema=test" \
  npx prisma migrate deploy

# Every run:
DATABASE_URL="<your Supabase DATABASE_URL>&schema=test" \
  npm run test:integration
```

If you add a migration that Prisma writes with a hardcoded `"public".` schema qualifier (it does
this occasionally for enum-rename operations — `add_leave_module` and `add_payroll_module` both
hit this), it will fail against `schema=test` with a generic "current transaction is aborted"
error. Fix it for the test schema only by stripping the `"public".` qualifiers from a copy of the
SQL, running that copy with `prisma db execute --file`, then
`prisma migrate resolve --applied <name>` — do **not** edit the checked-in migration file itself,
since its checksum is already recorded against what's applied to `public`.

## Production topology

- **Frontend** — Vercel. `vercel.json` rewrites `/api/:path*` to the Render backend and
  catch-all-rewrites everything else to `/index.html` for SPA routing/refresh.
- **Backend** — Render. Builds via `npm run build` (which now runs `prisma migrate deploy`
  automatically — see `build:server` in `package.json`) and starts via `npm start`. `PORT` comes
  from Render's injected env var (`env.PORT` in `src/server/shared/config/env.ts`).
- **Database + Storage** — Supabase (same project as local dev's `public` schema).

Because the frontend and API are only same-origin *through* the Vercel rewrite (they're on
different actual domains), the refresh-token cookie's `sameSite=strict` setting depends on that
rewrite staying correctly pointed at the Render URL — if it drifts back to a placeholder or a
stale host, auth breaks silently.

Before deploying to production:

- [ ] Set `NODE_ENV=production` on Render.
- [ ] Generate fresh `JWT_ACCESS_SECRET` and `TWO_FA_ENCRYPTION_KEY` — never reuse dev values.
- [ ] Set `CORS_ORIGIN` to the real Vercel frontend origin.
- [ ] Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_REDIRECT_URI`,
      and `GOOGLE_SENDER_EMAIL` (see `gmail-api-setup.md`) — the built-in Gmail API `EmailService`
      throws on startup-adjacent send attempts in production rather than silently dropping
      invite/reset emails if any of these are missing.
- [ ] Set `REDIS_URL` and switch the rate limiters to a Redis-backed store before running more
      than one API instance — the current limiters use an in-memory, per-process counter.
- [ ] Set `DATABASE_URL` and `DIRECT_URL` on Render to the Supabase pooler connection strings —
      `prisma migrate deploy` runs automatically on every build, so schema drift shouldn't recur.
- [ ] Confirm `DATABASE_URL` uses a least-privilege Postgres role, and TLS if the DB isn't on a private network.

## Known follow-ups (not blockers, tracked for a later pass)

- Frontend bundle is a single ~735 KB (219 KB gzip) chunk — fine for Module 1's scope, but
  route-based code splitting should be introduced once more modules/pages exist.
- No recovery-code redemption endpoint yet (codes are generated and shown once at 2FA-enable
  time, but there's no `/auth/2fa/recover` flow for a lost authenticator).
