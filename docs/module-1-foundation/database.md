# Module 1 — Database

Schema source of truth: [`prisma/schema.prisma`](../../prisma/schema.prisma). This document
covers the Module 1 models only; other models in that file (Attendance, Project, Ticket, etc.)
belong to future modules and are not yet backed by application code.

## Entity relationship overview

```
Tenant 1──* User 1──1 EmployeeProfile
Tenant 1──* Invite
Tenant 1──* AuditLog
User   1──* RefreshToken
User   1──* PasswordResetToken
User   1──* AuditLog        (as actor)
EmployeeProfile *──1 EmployeeProfile (self-relation: manager/subordinates)
```

Every tenant-scoped table carries a `tenantId` — including `EmployeeProfile`, which
denormalizes it from `User.tenantId` rather than requiring a join through `User` for the most
common query shape ("employees of tenant X").

## Models

### `Tenant`
The top-level organization boundary. `domain` is unique and used for workspace routing.
Branding fields (`primaryColor`, `secondaryColor`, `font`, `logoUrl`) support white-labeling.

### `User`
One row per login-capable account. `email` is globally unique (not per-tenant) — a person's
email identifies exactly one account across the whole platform.

| Field | Purpose |
|---|---|
| `status` | `PENDING_INVITE` → `ACTIVE` → `SUSPENDED`/`DEACTIVATED`. Login is only allowed when `ACTIVE`. |
| `twoFactorSecret` | AES-256-GCM ciphertext, never plaintext. |
| `twoFactorRecoveryCodesHash` | SHA-256 hashes only; plaintext codes are shown once at enable time and never stored. |
| `failedLoginCount` / `lockedUntil` | Brute-force lockout: 5 consecutive failures locks the account for 15 minutes. |

Indexes: `tenantId`, `(tenantId, role)`, `(tenantId, status)` — every tenant-admin screen
filters by one or both of these, and at 100k+ employees / thousands of tenants an unindexed
`WHERE tenantId = ?` is a full table scan.

### `RefreshToken`
One row per issued refresh token (renamed from the original `Session` model). `tokenHash` is a
SHA-256 hash of the opaque token handed to the client — the raw token is never persisted.
`familyId` groups every token descended from one login; rotating a token creates a new row in
the same family and revokes the old one. If a revoked token is presented again (theft/replay),
the **entire family** is revoked, forcing re-authentication everywhere that session was used.

### `PasswordResetToken`
One-hour-lived, single-use, hashed reset tokens. `usedAt` prevents replay.

### `Invite`
Tracks a pending invitation (`email` + `role` + hashed token) separately from the `User` row it
creates. Inviting a user creates **both** an `Invite` and a `User` in `PENDING_INVITE` status
(with an unusable placeholder password hash) so the user shows up in tenant user lists
immediately; accepting the invite sets a real password and flips status to `ACTIVE`.

### `AuditLog`
Append-only. `tenantId` and `actorUserId` are nullable (`onDelete: SetNull`) so deleting a
tenant or user never silently deletes its audit trail. `metadata` is a free-form `Json` column
and `targetType`/`targetId` are polymorphic strings — this lets every future module write audit
entries through `AuditLogService.record(...)` without a schema migration per module.

Indexes: `(tenantId, createdAt)`, `(actorUserId, createdAt)`, `(action, createdAt)` — the
expected query shapes for a tenant's activity feed, a specific user's history, and
security-incident triage by action type.

### `EmployeeProfile`
The base HR identity record. `tenantId` is denormalized (see above). Self-referential
`manager`/`subordinates` relation for the org chart. `employeeId` (e.g. `EMP-2026-A1B2C3`) is
globally unique and human-facing.

## Constraints worth knowing

- `Invite` cannot express "one pending invite per email per tenant" as a clean Prisma
  compound-unique (would need a Postgres partial/filtered unique index, which Prisma doesn't
  model directly) — this rule is enforced in `InviteRepository`/`UserService` application code
  instead.
- `User.email` is a **global** unique constraint by design (see above), not per-tenant.

## Migrations

No production data exists yet — Module 1 replaces a throwaway in-memory mock store, so the
initial migration is a fresh `prisma migrate dev`, not a data migration. See
[`deployment.md`](./deployment.md) for the exact commands.
