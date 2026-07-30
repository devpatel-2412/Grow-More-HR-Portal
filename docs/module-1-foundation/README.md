# Module 1 — Foundation: Multi-Tenant Auth, RBAC & Identity

This is the bedrock module of the Business OS platform. Every other module (HRMS, ERP, CRM,
ATS, Projects, Finance, ...) depends on the identity, authorization, and multi-tenancy
primitives established here.

## What this module owns

- **Tenants** — the top-level organization boundary. Every other table is scoped to a tenant.
- **Users & authentication** — signup, login, JWT access tokens, rotating refresh tokens, 2FA (TOTP), password reset/change, invites.
- **RBAC** — a role catalogue (`UserRole`) plus a resource:action permission catalogue that all future modules build on.
- **Employee profiles** — the base identity record HR/PM/ATS modules attach to.
- **Audit log** — an append-only, explicitly-written trail of security-relevant events, used by every other module.

## Documents in this folder

- [`database.md`](./database.md) — schema, relationships, indexes, and the reasoning behind them.
- [`api.md`](./api.md) — every REST endpoint this module exposes.
- [`environment-variables.md`](./environment-variables.md) — every env var, what it does, and how to generate it.
- [`deployment.md`](./deployment.md) — how to run this locally and in production.
- [`folder-structure.md`](./folder-structure.md) — the module convention every future feature module follows.

## Architectural decisions (why it's built this way)

1. **Hybrid RBAC + permissions.** `UserRole` (6 coarse roles) drives onboarding UX and the rare
   role-shaped check (`requireRole('SUPER_ADMIN')`). Everything else goes through
   `requirePermission('resource:action')`, resolved via a static `ROLE_PERMISSIONS` map in
   `src/server/shared/permissions/permissions.ts`. Pure role checks sprinkled across every
   future module become unmaintainable; pure permissions from day one would be over-engineering
   for 6 roles. The static map is structured so a later per-tenant custom-role table can replace
   its internals without touching any call site.
2. **Refresh tokens are server-side and rotating.** Stored as a SHA-256 hash (never the raw
   token) in `RefreshToken`, with a `familyId` used to detect and respond to token theft: if an
   already-rotated token is presented again, the entire family is revoked and the user must log
   in again. Access tokens stay stateless JWTs (15 min TTL) so most requests need no DB hit.
3. **2FA secrets are encrypted at rest** (AES-256-GCM, `TWO_FA_ENCRYPTION_KEY`), not stored
   plaintext. Recovery codes are only ever persisted as SHA-256 hashes.
4. **Audit logging is explicit, not a Prisma middleware.** `AuditLogService.record(...)` is
   called by hand at each security-relevant point. An implicit global interceptor risks logging
   sensitive payloads (passwords, tokens) and makes per-action messaging hard to control. A
   failed audit write never breaks the calling request — it's logged and swallowed.
5. **Same-origin deployment.** The Vite dev server proxies `/api` to Express, and production
   reverse-proxies both under one domain. This lets the refresh-token cookie use
   `sameSite=strict` with no cross-site cookie configuration.
6. **Access tokens live in memory only** (a module-level variable in
   `src/shared/lib/api-client.ts`), never localStorage/sessionStorage — reduces what an XSS bug
   could exfiltrate. The refresh token lives in an httpOnly cookie the frontend JS never reads.

## What's intentionally out of scope for Module 1

- Per-tenant custom roles / a `RolePermission` DB table (the static map is the placeholder for this).
- A real transactional email provider (the dev `EmailService` logs to console; wiring SendGrid/SES is a Module 1 follow-up before production).
- Redis-backed rate limiting (current limiters are in-memory, correct only for a single API instance).
- Recovery-code login (recovery codes are generated and shown once at 2FA-enable time, but there is no `/auth/2fa/recover` redemption endpoint yet).
