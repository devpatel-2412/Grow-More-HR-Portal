# Module 1 — Deployment Guide

## Local development

### 1. Start Postgres

```bash
docker compose up -d postgres
```

This starts `postgres:16-alpine` on `localhost:5432` with credentials matching `.env.example`
(`business_os` / `business_os_dev_password`, database `business_os`). An optional pgAdmin is
available via `docker compose --profile tools up -d pgadmin` (http://localhost:5050).

### 2. Configure environment

```bash
cp .env.example .env
# then edit .env: generate real secrets (see environment-variables.md)
```

### 3. Install dependencies, generate the Prisma client, run migrations

```bash
npm install
npm run prisma:generate
npm run prisma:migrate   # prisma migrate dev — creates the initial schema
```

### 4. Run the app

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
npm run test:integration # full HTTP integration tests — REQUIRES a running, migrated Postgres
```

For integration tests specifically, point `DATABASE_URL` (in `vitest.integration.config.ts` or
via env override) at a **test** database, not your dev database — it truncates tables between
tests:

```bash
createdb -h localhost -U business_os business_os_test   # or via psql
DATABASE_URL=postgresql://business_os:business_os_dev_password@localhost:5432/business_os_test \
  npx prisma migrate deploy
npm run test:integration
```

## Production build

```bash
npm run build   # tsc + vite build for the client, tsc for the server
npm start        # node dist/server/server.js
```

Before deploying to production:

- [ ] Set `NODE_ENV=production`.
- [ ] Generate fresh `JWT_ACCESS_SECRET` and `TWO_FA_ENCRYPTION_KEY` — never reuse dev values.
- [ ] Set `CORS_ORIGIN` to the real frontend origin.
- [ ] Serve the frontend and API from the same origin (reverse proxy), or revisit the refresh
      cookie's `sameSite`/`domain` settings if you deliberately split them across subdomains.
- [ ] Wire a real `EmailService` implementation (SendGrid/SES/etc) — the built-in one throws on
      startup-adjacent send attempts in production rather than silently dropping invite/reset emails.
- [ ] Set `REDIS_URL` and switch the rate limiters to a Redis-backed store before running more
      than one API instance — the current limiters use an in-memory, per-process counter.
- [ ] Run `prisma migrate deploy` (not `migrate dev`) against the production database.
- [ ] Confirm `DATABASE_URL` uses a least-privilege Postgres role, and TLS if the DB isn't on a private network.

## Known follow-ups (not blockers, tracked for a later pass)

- Frontend bundle is a single ~735 KB (219 KB gzip) chunk — fine for Module 1's scope, but
  route-based code splitting should be introduced once more modules/pages exist.
- No recovery-code redemption endpoint yet (codes are generated and shown once at 2FA-enable
  time, but there's no `/auth/2fa/recover` flow for a lost authenticator).
