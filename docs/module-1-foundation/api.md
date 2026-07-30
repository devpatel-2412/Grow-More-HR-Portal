# Module 1 — API Reference

Base URL: `/api/v1`. All responses are JSON with the envelope `{ "data": ... }` on success (list
endpoints add `"meta": { page, limit, total, totalPages }`) or `{ "error": { code, message,
details? } }` on failure. All timestamps are ISO 8601 UTC.

**Auth**: `Authorization: Bearer <accessToken>` header. Refresh tokens travel as an httpOnly
`refresh_token` cookie, scoped to path `/api/v1/auth` — the frontend never reads or sets it
directly; `fetch` calls must use `credentials: 'include'`.

## Auth — `/api/v1/auth`

| Method | Path | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| POST | `/signup` | Public | 10/15min per IP+email | Creates a Tenant + first `ADMIN` User + their `EmployeeProfile`, atomically. Returns an access token and sets the refresh cookie. |
| POST | `/login` | Public | 10/15min per IP+email | Email+password login. Returns tokens, or `{ requiresTwoFactor: true, challengeToken }` if 2FA is enabled. |
| POST | `/2fa/verify` | Challenge token in body | 10/15min per IP | Completes login by verifying a TOTP code against the challenge issued by `/login`. |
| POST | `/refresh` | Refresh cookie | 30/15min per IP | Rotates the refresh token, returns a new access token. Reusing an already-rotated token revokes the whole token family. |
| POST | `/logout` | Bearer | — | Revokes the current refresh token, clears the cookie. |
| POST | `/logout-all` | Bearer | — | Revokes every refresh token for the account (all devices). |
| GET | `/me` | Bearer | — | Current user + employee profile + tenant. |
| POST | `/password-reset/request` | Public | 5/hour per IP+email | Always responds identically whether or not the email exists (no user enumeration). |
| POST | `/password-reset/confirm` | Public | 5/hour per IP+email | Consumes a reset token, sets a new password, revokes all sessions. |
| POST | `/password/change` | Bearer | — | Requires current password. Revokes all sessions on success. |
| POST | `/2fa/enroll` | Bearer | — | Begins TOTP enrollment; returns a QR code data URL and the raw secret. |
| POST | `/2fa/enable` | Bearer | — | Confirms enrollment with a valid code; returns 10 one-time recovery codes (shown once). |
| POST | `/2fa/disable` | Bearer | — | Requires current password **and** a valid code. |

## Tenants — `/api/v1/tenants`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | `SUPER_ADMIN` | Platform-provisioned tenant creation (self-serve onboarding goes through `/auth/signup` instead). |
| GET | `/` | `SUPER_ADMIN` | Paginated list of all tenants, searchable by name/domain. |
| GET | `/:id` | `tenant:read` permission | Tenant details — non-`SUPER_ADMIN` callers are tenant-scoped to their own tenant. |
| PATCH | `/:id` | `tenant:update` permission | Update branding/settings. Same tenant-scoping as above. |

## Users — `/api/v1/users`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/invite` | `user:invite` permission | Invites a user by email + role into the caller's tenant. Creates a `PENDING_INVITE` User immediately and emails an accept link. |
| POST | `/invite/accept` | Public (token in body) | Sets a password, activates the account, and creates its `EmployeeProfile`. |
| GET | `/` | `user:read:tenant` permission | Paginated, filterable (`role`, `status`), searchable (email), sortable list — tenant-scoped. |
| GET | `/:id` | `user:read:tenant` permission | Single user — 404s (not 403) for a cross-tenant id, so tenant boundaries aren't leaked via status codes. |
| PATCH | `/:id/role` | `user:role:update` permission | Change a user's role. |
| PATCH | `/:id/status` | `user:status:update` permission | Suspend/reactivate/deactivate. |

## Employees — `/api/v1/employees`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | `employee:create` permission | Creates an `EmployeeProfile` for an existing tenant User. |
| GET | `/` | `employee:read:tenant` permission | Paginated, filterable (department/status/manager), searchable, sortable — tenant-scoped. |
| GET | `/me` | Bearer only | The caller's own employee profile. |
| GET | `/:id` | `employee:read:tenant` permission | Single profile, tenant-scoped. |
| PATCH | `/:id` | `employee:update` permission | Update department/designation/status/manager. |

## Audit log — `/api/v1/audit-logs`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | `audit:read` permission | Paginated, filterable by actor/action/date range. Non-`SUPER_ADMIN` callers only ever see their own tenant's entries. |

## Pagination contract

Every list endpoint shares the same query parameters and response shape:

- `page` (default 1), `limit` (default 20, max 100)
- `sort` — `field:asc` or `field:desc`; unknown fields silently fall back to a safe default (prevents probing for hidden columns)
- `search` — free-text, endpoint-specific fields
- Response: `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }`

## Error codes

| HTTP | `error.code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `BAD_REQUEST` | Request failed Zod validation — `error.details` has field-level messages. |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token, or invalid credentials. |
| 403 | `FORBIDDEN` | Authenticated but lacking the required role/permission, or a tenant-scope violation. |
| 404 | `NOT_FOUND` | Resource doesn't exist, or exists in a different tenant (tenant-scoped 404s, not 403s). |
| 409 | `CONFLICT` | Duplicate domain/email, pending invite already exists, etc. |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded on that endpoint. |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error — never leaks internals; check server logs by `X-Request-Id`. |
