# Business OS

An enterprise Business Operating System (HRMS + ERP + CRM + ATS + Project Management, multi-tenant SaaS) being built module by module.

**Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4 (frontend) · Node.js + Express + Prisma + PostgreSQL (backend) · JWT + rotating refresh tokens + RBAC + TOTP 2FA (auth).

## Status

- ✅ **Module 1 — Foundation**: multi-tenant auth, RBAC, employee identity. See [`docs/module-1-foundation/`](./docs/module-1-foundation/).
- ⏳ Every other module (Attendance, Payroll, Projects, ATS, Finance, ...) has a Prisma schema shape reserved in `prisma/schema.prisma` but no application code yet — they are built one at a time, following the same process documented in Module 1.

## Quickstart

```bash
docker compose up -d postgres
cp .env.example .env   # then fill in real secrets — see docs/module-1-foundation/environment-variables.md
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev             # API on :5000, client on :5173 (proxied, same-origin)
```

Full setup, testing, and production deployment steps: [`docs/module-1-foundation/deployment.md`](./docs/module-1-foundation/deployment.md).

## Documentation

Each module has its own docs folder covering architecture decisions, database design, API
reference, environment variables, deployment, and folder structure:

- [`docs/module-1-foundation/`](./docs/module-1-foundation/)

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run API + client together in watch mode |
| `npm run build` | Production build (server + client) |
| `npm start` | Run the built production server |
| `npm test` | Backend unit tests (mocked, no DB) |
| `npm run test:client` | Frontend component tests (jsdom + msw) |
| `npm run test:integration` | Full-stack HTTP tests — requires a running, migrated Postgres |
| `npm run typecheck:server` / `typecheck:client` | Type-check without emitting |
| `npm run prisma:migrate` | Apply schema changes locally (`prisma migrate dev`) |
