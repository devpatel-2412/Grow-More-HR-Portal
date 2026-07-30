# Business OS — Feature Audit

**Scanned:** entire repository, current working tree (uncommitted — no git commits exist yet).
**Method:** direct inspection of `src/server/**`, `src/**` (frontend), and `prisma/schema.prisma` — every route file, page, component, and model enumerated by hand, not inferred from memory.

---

## 1. Every route (backend)

Mounted in `src/server/app.ts`, base path `/api/v1` (plus an unversioned `GET /api/health`):

| Method | Path | File |
|---|---|---|
| GET | `/api/health` | `app.ts` |
| POST | `/api/v1/auth/signup` | `auth.routes.ts` |
| POST | `/api/v1/auth/login` | `auth.routes.ts` |
| POST | `/api/v1/auth/2fa/verify` | `auth.routes.ts` |
| POST | `/api/v1/auth/refresh` | `auth.routes.ts` |
| POST | `/api/v1/auth/logout` | `auth.routes.ts` |
| POST | `/api/v1/auth/logout-all` | `auth.routes.ts` |
| GET | `/api/v1/auth/me` | `auth.routes.ts` |
| POST | `/api/v1/auth/password-reset/request` | `auth.routes.ts` |
| POST | `/api/v1/auth/password-reset/confirm` | `auth.routes.ts` |
| POST | `/api/v1/auth/password/change` | `auth.routes.ts` |
| POST | `/api/v1/auth/2fa/enroll` | `auth.routes.ts` |
| POST | `/api/v1/auth/2fa/enable` | `auth.routes.ts` |
| POST | `/api/v1/auth/2fa/disable` | `auth.routes.ts` |
| POST | `/api/v1/tenants` (SUPER_ADMIN only) | `tenant.routes.ts` |
| GET | `/api/v1/tenants` (SUPER_ADMIN only) | `tenant.routes.ts` |
| GET | `/api/v1/tenants/:id` | `tenant.routes.ts` |
| PATCH | `/api/v1/tenants/:id` | `tenant.routes.ts` |
| POST | `/api/v1/users/invite/accept` | `user.routes.ts` |
| POST | `/api/v1/users/invite` | `user.routes.ts` |
| GET | `/api/v1/users` | `user.routes.ts` |
| GET | `/api/v1/users/:id` | `user.routes.ts` |
| PATCH | `/api/v1/users/:id/role` | `user.routes.ts` |
| PATCH | `/api/v1/users/:id/status` | `user.routes.ts` |
| POST | `/api/v1/employees` | `employee.routes.ts` |
| GET | `/api/v1/employees/me` | `employee.routes.ts` |
| GET | `/api/v1/employees` | `employee.routes.ts` |
| GET | `/api/v1/employees/:id` | `employee.routes.ts` |
| PATCH | `/api/v1/employees/:id` | `employee.routes.ts` |
| GET | `/api/v1/audit-logs` | `audit.routes.ts` |

**29 endpoints total**, all with Zod validation, auth/permission middleware, and structured logging.

## 2. Every route (frontend)

Defined in `src/routes/router.tsx`:

| Path | Page | Protected? |
|---|---|---|
| `/login` | `LoginPage` | No |
| `/signup` | `SignupPage` | No |
| `/two-factor` | `TwoFactorPage` | No (requires in-flight challenge token) |
| `/forgot-password` | `ForgotPasswordPage` | No |
| `/reset-password` | `ResetPasswordPage` | No |
| `/` | `DashboardPage` | Yes (`ProtectedRoute` → `AppShell`) |
| `*` | redirects to `/` | — |

**6 routes total.** Every other domain (users, employees, tenants, audit) has a working API but **no frontend route at all**.

## 3. Every page

`src/modules/auth/pages/`: `DashboardPage.tsx`, `ForgotPasswordPage.tsx`, `LoginPage.tsx`, `ResetPasswordPage.tsx`, `SignupPage.tsx`, `TwoFactorPage.tsx` — **6 pages**, all in the `auth` module. No pages exist yet for `employees` or `tenants` modules despite those folders existing with `api/hooks/components/pages/schemas/types` subfolders reserved.

## 4. Every React component

| Component | Location | Used? |
|---|---|---|
| `LoginForm` | `modules/auth/components/` | ✅ `LoginPage` |
| `SignupForm` | `modules/auth/components/` | ✅ `SignupPage` |
| `TwoFactorVerifyForm` | `modules/auth/components/` | ✅ `TwoFactorPage` |
| `PasswordResetRequestForm` | `modules/auth/components/` | ✅ `ForgotPasswordPage` |
| `PasswordResetForm` | `modules/auth/components/` | ✅ `ResetPasswordPage` |
| `TwoFactorSettings` | `modules/auth/components/` | ✅ `DashboardPage` |
| `AuthContext` (+ `AuthProvider`, `useAuth`) | `modules/auth/context/` | ✅ `App.tsx` |
| `Button`, `Input`, `Label`, `Card`, `InputOTP`, `ThemeToggle` | `shared/components/ui/` | ✅ used throughout |
| `AppShell` | `shared/components/layout/` | ✅ `router.tsx` |
| `AuthLayout` | `shared/components/layout/` | ✅ all 5 public auth pages |
| `ProtectedRoute` | `shared/components/layout/` | ✅ `router.tsx` |
| `RoleGate` | `shared/components/layout/` | ⚠️ **built, never imported anywhere** |
| `LoadingSkeleton` / `Skeleton` / `PageLoadingSkeleton` | `shared/components/feedback/` | ✅ `ProtectedRoute` |
| `EmptyState` | `shared/components/feedback/` | ⚠️ **built, never imported anywhere** |
| `ErrorState` / `InlineFormError` | `shared/components/feedback/` | ✅ used in every auth form |
| `ThemeProvider` | `shared/lib/theme.tsx` | ✅ `App.tsx` |

**~20 components**, 2 of which (`RoleGate`, `EmptyState`) are dead code — built ahead of need for a screen that doesn't exist yet.

## 5. Every API endpoint

See section 1 — same list, cross-referenced against `docs/module-1-foundation/api.md` (in sync).

## 6. Every Prisma model

25 models defined. **Only 7 have any application code** (routes/service/repository/UI):

| Model | App code? | Belongs to |
|---|---|---|
| `Tenant` | ✅ | Module 1 |
| `User` | ✅ | Module 1 |
| `RefreshToken` | ✅ | Module 1 |
| `Invite` | ✅ | Module 1 |
| `PasswordResetToken` | ✅ | Module 1 |
| `AuditLog` | ✅ | Module 1 |
| `EmployeeProfile` | ✅ | Module 1 |
| `Attendance` | ❌ schema only | Attendance module |
| `LeaveRequest` | ❌ schema only | Leave module |
| `PayrollItem` | ❌ schema only | Payroll module |
| `JobPosting`, `Candidate` | ❌ schema only | ATS module |
| `Asset` | ❌ schema only | Asset Mgmt module |
| `Project`, `Task` | ❌ schema only | Project Mgmt module |
| `DailyWorkReport` | ❌ schema only | DWR module |
| `ClientPortal` | ❌ schema only | Client Portal module |
| `FinanceDocument` | ❌ schema only | Finance/Billing module |
| `Visitor` | ❌ schema only | Visitor Mgmt module |
| `RoomBooking` | ❌ schema only | Room Booking module |
| `KnowledgeBaseArticle` | ❌ schema only | Knowledge Base module |
| `Ticket` | ❌ schema only | Helpdesk module |
| `SecureDocument` | ❌ schema only | Document Mgmt module |
| `CanvaTemplate` | ❌ schema only | Poster/Template Builder |
| `Subscription` | ❌ schema only | Billing/Plans module |

No models exist yet for **CRM** (Lead/Deal/Contact/Pipeline) or **Inventory** (Stock/Warehouse/SKU) — those weren't even scaffolded in the original prototype schema.

---

## Comparison against the Business OS requirements

The target is: HRMS · ERP · CRM · ATS · Project Mgmt · Task Mgmt · Daily Work Reports · Payroll · Attendance · Leave · Finance · Billing · Client Portal · Helpdesk · Asset Mgmt · Inventory · Knowledge Base · AI Automation · Document Automation · Workflow Automation · Multi-Tenant SaaS · White Label.

| Domain | Status | Notes |
|---|---|---|
| **Multi-Tenant SaaS (foundation)** | 🟢 ~90% | Auth, RBAC, tenant isolation, audit log all working end-to-end |
| **White Label** | 🟡 ~15% | `Tenant` has `logoUrl`/`primaryColor`/`secondaryColor`/`font` columns; nothing reads/applies them in the UI, no admin screen to set them |
| **HRMS** (core identity) | 🟡 ~20% | `EmployeeProfile` CRUD API exists; no attendance, leave, payroll, or HR admin UI |
| **ATS** | 🔴 0% | Schema only |
| **Project/Task Mgmt** | 🔴 0% | Schema only |
| **Daily Work Reports** | 🔴 0% | Schema only |
| **Payroll** | 🔴 0% | Schema only |
| **Attendance** | 🔴 0% | Schema only |
| **Leave Mgmt** | 🔴 0% | Schema only |
| **Finance / Billing** | 🔴 0% | Schema only |
| **Client Portal** | 🔴 0% | Schema only |
| **Helpdesk** | 🔴 0% | Schema only |
| **Asset Mgmt** | 🔴 0% | Schema only |
| **Inventory** | 🔴 0% | No schema at all |
| **Knowledge Base** | 🔴 0% | Schema only |
| **CRM** | 🔴 0% | No schema at all |
| **ERP** (general) | 🔴 0% | No scope defined yet beyond Finance/Inventory |
| **AI Automation** | 🔴 0% | The old discarded prototype had a fake `/api/ai/chat` mock; nothing real exists |
| **Document Automation** | 🔴 0% | `SecureDocument`/`CanvaTemplate` schema only |
| **Workflow Automation** | 🔴 0% | Not designed yet |

---

## Completed features

- Multi-tenant signup (tenant + first admin + employee profile, atomic transaction)
- Login with lockout after 5 failed attempts (15 min)
- JWT access tokens (15 min) + rotating opaque refresh tokens (7d / 30d remember-me), stored hashed
- Refresh-token theft detection (reuse of a rotated token revokes the whole token family) — verified live via integration test
- TOTP 2FA: enroll (QR code), enable (+ 10 recovery codes shown once), disable, login challenge — verified live in browser
- Password reset (request/confirm, no user-enumeration) and in-session password change (backend only, see Missing)
- Logout / logout-all-devices (backend only, see Missing)
- Hybrid RBAC: 6 roles + a `resource:action` permission catalogue, enforced server-side on every protected route
- Tenant isolation: cross-tenant reads return 404, not 403 (doesn't leak existence) — verified live via integration test
- Audit logging on every security-relevant action (login success/failure, token refresh/reuse, 2FA changes, invites, role/status changes, tenant/employee CRUD)
- Rate limiting on all auth endpoints (in-memory; see Suggested Improvements)
- Employee profile CRUD API, tenant-scoped, paginated/filterable/sortable
- User invite → accept flow (creates `PENDING_INVITE` user immediately, activates on accept) — backend only
- Tenant admin CRUD API (SUPER_ADMIN-gated creation/listing; tenant-scoped read/update)
- Dark/light theme, persisted, on every screen including pre-login
- 67 backend unit tests, 10 integration tests (real HTTP + real Postgres), 5 frontend component tests — all passing
- Full API/DB/deployment/env-var documentation in `docs/module-1-foundation/`

## Missing features

Ranked by how close they are to "just needs a UI" vs. "needs to be designed from scratch":

**Backend exists, frontend missing:**
- Change password (while logged in) — no settings form, only the token-based reset form
- Logout-all-devices — no button
- Invite a teammate — no form (`POST /users/invite` has no UI)
- User management (list/search/change role/suspend) — no screen
- Employee directory (list/create/edit) — no screen beyond "my own profile" data on the dashboard
- Tenant branding/settings edit — no screen
- Audit log viewer — no screen

**Backend and frontend both missing:**
- Recovery-code login (codes are generated and shown once, but there's no `/auth/2fa/recover` redemption endpoint or UI for "I lost my authenticator")
- Every module beyond Module 1 (Attendance, Leave, Payroll, ATS, PM/Tasks, DWR, Finance, Client Portal, Helpdesk, Assets, Inventory, KB, CRM, AI features, document/workflow automation)
- Real transactional email (current `EmailService` just logs to console in dev and throws in production if left unconfigured)
- Redis-backed rate limiting (current limiter is in-memory/per-process only)
- Per-tenant custom roles (the permission system is designed to support this later, but the DB table and admin UI don't exist)

## Broken functionality

Nothing found that is implemented-but-wrong in the tested paths (signup/login/refresh/2FA/RBAC/tenant-isolation are covered by passing integration tests). Issues found are gaps, not defects, with two exceptions already fixed during this build:
- ~~`express-rate-limit` v8 IPv6 key-generator validation error~~ — fixed
- ~~Dead `JWT_REFRESH_SECRET` env var (validated, never used)~~ — fixed

Two components are **dead code** (built, never wired up): `RoleGate.tsx` and `EmptyState.tsx`. Not broken, just unreachable — worth using or removing before they rot.

## TODO list

1. Add a "Change password" and "Log out all devices" section to `DashboardPage`.
2. Build a minimal Users module frontend (`modules/users/`): invite form, user list/table, role/status controls — the folders already exist, empty.
3. Build a minimal Employees module frontend beyond "my profile": directory list, create/edit form.
4. Build a Tenant settings screen (branding fields → actually apply `primaryColor`/`font` to the UI, closing the White Label gap).
5. Build an Audit Log viewer screen (SUPER_ADMIN/ADMIN only).
6. Either wire `RoleGate`/`EmptyState` into a real screen or delete them.
7. Wire a real email provider (SendGrid/SES) behind the existing `EmailService` interface before any production deploy.
8. Add Redis-backed rate limiting before running more than one API instance.
9. Design and build the next domain module — Attendance is the natural next pick since its schema already exists and it's the most-referenced dependency for Payroll/DWR.
10. Add a recovery-code redemption endpoint + UI for 2FA account recovery.

## Suggested improvements

- **Code splitting**: the frontend is a single ~735 KB JS chunk. Fine at Module 1's size; route-based `React.lazy()` splitting should start once 2-3 more modules exist.
- **Shared Zod schemas**: client and server auth validation schemas are hand-duplicated (documented trade-off in `auth.schemas.ts`) — worth revisiting a shared-package or path-alias approach once the duplication starts drifting.
- **`git init` was run but nothing has been committed yet** — worth an initial commit before more modules pile on, so there's a real diff history from here forward.
- **No CI configured** — typecheck/lint/unit tests are fast and deterministic; a GitHub Actions workflow running `npm run typecheck:server && npm run typecheck:client && npx oxlint src && npm test && npm run test:client` on every push would catch regressions automatically as more modules land.
- **No CRM or Inventory schema exists** — these were in the original requirements but never scaffolded even at the schema level; worth deciding where they land in the module roadmap.

## Estimated completion percentage

| Scope | Estimate | Basis |
|---|---|---|
| **Module 1 (Foundation) itself** | **~85%** | Core auth/RBAC/audit/tenancy is production-solid and tested; the gap is entirely admin-UI screens for features whose APIs already exist (users, invites, tenant settings, audit viewer) |
| **Full Business OS vision** (all 21+ domains listed in the requirements) | **~4–5%** | 1 of roughly 14 major functional domains has real (backend+frontend) implementation; ~10 more have a reserved DB schema and zero app code; CRM and Inventory have neither |

This is expected and by design at this stage — the project is explicitly being built one module at a time, and Module 1 was scoped as the shared foundation every later module depends on, not as a demo of breadth.
