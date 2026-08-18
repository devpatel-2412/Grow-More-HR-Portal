# Security Hardening — Decisions & Implementation Notes

This document records what was implemented from the P1/P2 security hardening roadmap, the exact
reasoning behind each decision, what was deliberately *not* done in this pass, and why. Scope was
held strictly to the roadmap items — no unrelated files, business logic, UI, RBAC rules, or API
contracts were touched.

**Status:** P1 (items 1–5) fully implemented. P2 items 7–9 implemented. P2 item 6 (mandatory 2FA
for privileged roles) is **deferred** — see its own section below for why.

---

## P1-1 — Removed temporary diagnostic logging from the refresh-token flow

**What:** Removed the `[AUTH REFRESH]` `logger.info`/`logger.warn` calls in `auth.controller.ts`
and most of the ones in `auth.service.ts`'s `refresh()` method (cookie-presence, session-found,
expired, inactive-user, force-logout, inactivity-timeout, and the success case).

**Why:** This logging was added during an earlier debugging session to trace a specific production
401 issue and was explicitly commented `"Remove once the production 401 root cause is confirmed
and fixed"`. That root cause was found and fixed in a later pass unrelated to this logging. Leaving
it in place means every single refresh call — the most frequently-hit endpoint in the whole
authentication flow — logs request metadata (`Origin`, `Host`, forwarded headers) forever, for no
ongoing purpose. It never logged secrets, but unnecessary permanent logging is still something a
future reader has to reason about ("is this load-bearing?").

**Files:** `src/server/modules/auth/auth.controller.ts`, `src/server/modules/auth/auth.service.ts`

**Note:** the `env` and `isProduction` imports in `auth.controller.ts` were kept (still used by
`setRefreshCookie`); the now-unused `logger` import there was removed. `logger` is still imported
and used in `auth.service.ts` — see P1-4.

---

## P1-2 — Pinned the JWT verification algorithm

**What:** Every `jwt.verify()` call (`verifyAccessToken`, `verifyTwoFactorChallengeToken`) and
`jwt.sign()` call now explicitly passes `algorithms: ['HS256']` / `algorithm: 'HS256'`, via one
shared `JWT_ALGORITHM` constant.

**Why:** The `jsonwebtoken` library's own defaults were already safe (it never accepts `alg: none`,
and a plain string secret can't satisfy an asymmetric algorithm), so this wasn't fixing an active
exploit. It's standard OWASP JWT-hardening guidance: pinning means a verify call can only ever
succeed against the one algorithm actually used to sign, independent of the library's own defaults
ever changing under a future dependency bump. Zero behavior change for any legitimate token.

**Files:** `src/server/shared/utils/jwt.util.ts`

**Tests added:** `jwt.util.security.test.ts` — verifies a forged `alg: none` token is rejected, and
a token re-signed with a *different* HMAC algorithm (HS512, same secret) is also rejected, proving
the pinning is what's doing the rejecting.

---

## P1-3 — Separate, optional secret for the 2FA challenge token

**What:** Added an optional `JWT_TWO_FA_SECRET` env var. When set, the short-lived (5-minute) 2FA
challenge token (issued between "password correct" and "TOTP code verified") is signed and verified
with it instead of `JWT_ACCESS_SECRET`. When unset (the default), it falls back to
`JWT_ACCESS_SECRET` — today's existing behavior, unchanged.

**Why:** Previously both token kinds shared one secret, distinguished only by a `type` field inside
the payload. That's correct as implemented, but it means the entire boundary between "half-
authenticated" and "fully authenticated" rested on one `if` check remembering to exist and being
correct forever. A separate secret makes that boundary structural instead: a bug in the type check
would now fail *closed* (wrong secret → signature verification fails outright) rather than relying
on the check alone.

**Decision — made optional, not required:** A brand-new *required* secret would fail environment
validation on the next boot of any deployment that hasn't set it (this app's `env.ts` validates and
`process.exit(1)`s on a missing required var) — including the already-running Render deployment,
which I have no ability to configure from this environment. Making it optional-with-fallback avoids
that entirely; it's purely additive hardening, not a required migration.

**Why no previous-secret fallback for this one (unlike P2-9):** the challenge token lives 5 minutes.
A secret rotation overlapping with someone's 5-minute login window is exceedingly unlikely, and
adding rotation-fallback logic for that edge case wasn't worth the extra complexity.

**Files:** `src/server/shared/utils/jwt.util.ts`, `src/server/shared/config/env.ts`, `.env.example`

**Tests added:** `jwt.util.security.test.ts` — verifies that once `JWT_TWO_FA_SECRET` is configured,
a challenge token does *not* verify against the plain access-token secret (proving real
cryptographic separation, not just the `type` field).

---

## P1-4 — Reuse detection now logs at `error` level, as the alerting hook

**What:** The refresh-token-reuse-detected branch (in `auth.service.ts`'s `refresh()`) now logs at
`logger.error` (was `logger.warn`, bundled in with the generic diagnostic logging removed in P1-1),
with a clear, permanent (non-temporary) message and structured fields: `tokenId`, `familyId`,
`userId`, `previousRevokedReason`, `tokenAgeMs`, `ipAddress`. Never logs the token or its hash.

**Why this fires here specifically:** this branch only executes when a refresh token that was
*already rotated* gets presented again — which only happens if a token was copied (a stolen
cookie, a synced/leaked device) and the thief and the legitimate owner are now racing to use it.
It's the single strongest available signal of an actual credential-theft attempt in progress
anywhere in this codebase.

**Decision — log-level escalation, not a new notification channel:** Building actual email/Slack/
webhook alerting would require deciding *who* gets notified (which admin? tenant-scoped or
platform-wide?), a delivery channel, and a message template — real product decisions that touch
the notification/email modules, well outside "fix this specific finding" scope, and risky to guess
at without your input. Elevating to `error` level is the correct, infrastructure-agnostic
interpretation of "alert on this, not just log it": most log aggregation/observability tooling
(and Render's own log viewer) already treats error-level lines as the ones worth surfacing/
escalating, by convention. **Follow-up, if you want it:** once you tell me who should be notified
and how, wiring an actual notification on this one event is a small, contained addition on top of
this.

**Files:** `src/server/modules/auth/auth.service.ts`

**Tests added:** extended the existing "detects reuse of an already-revoked token" test in
`auth.service.test.ts` to assert `logger.error` is called with the expected structured fields.

---

## P1-5 — Constant-time recovery-code comparison

**What:** `TwoFactorService.verifyRecoveryCode` now compares each stored hash against the
candidate's hash using `crypto.timingSafeEqual` (via a small `timingSafeHashEqual` helper) instead
of `Array.indexOf`'s ordinary string equality.

**Why:** OWASP-standard defense-in-depth for any secret comparison — the same treatment a
password-hash comparison gets. Real-world risk here is low (these are hashes of high-entropy
random 10-character codes, not directly guessable secrets), which is exactly why this was P1 and
not urgent, not why it was skipped.

**Deliberately not done — full array-position constant-time iteration:** `Array.findIndex` still
short-circuits once a match is found, which means the *position* of a match in the list is timing-
observable, separate from the byte-level comparison of any one hash. I did not add "iterate every
entry unconditionally, accumulate via constant-time OR" to eliminate that too. With ~10
unordered, high-entropy recovery codes and no secondary secret derivable from array position, the
realistic exploitability of that specific signal is essentially nil, and closing it would add real
complexity for no measurable benefit — the kind of over-engineering you asked to avoid.

**Files:** `src/server/modules/two-factor/two-factor.service.ts`

**Tests:** the existing `two-factor.service.test.ts` coverage (accept valid code once, reject
reuse, reject unknown code) already exercises both the match and no-match paths of the new logic;
it passes unchanged, confirming behavior-preservation.

---

## P2-7 — Redis-backed rate limiting and permission cache, with automatic fallback

**What:** Added `src/server/shared/redis.client.ts` — a lazily-created, singleton `ioredis` client
that returns `null` when `REDIS_URL` isn't configured. Both `rate-limit.middleware.ts` (all five
limiters: login, refresh, password-reset, 2FA-verify, global) and
`permission-resolver.service.ts`'s cache now use a Redis-backed store when a client is available,
falling back to their previous in-memory behavior otherwise.

**Why:** Both were already explicitly documented in this codebase as "correct for a single
instance, must move to Redis before scaling" — `REDIS_URL` already existed as a documented-but-
unused env var slot for exactly this. Left as-is, the danger is that it fails *silently*: run a
second server instance without this, and login rate limiting quietly becomes "10 attempts per
instance" instead of "10 total," and a revoked permission can take up to 60 seconds longer to
propagate to whichever instance didn't happen to serve the write — with nothing erroring to
indicate the weakening.

**Design decisions:**
- **Fallback-first, not Redis-required.** `getRedisClient()` returns `null` when `REDIS_URL` is
  unset, and every call site checks for that before touching Redis at all. This is the same
  conditional-provider pattern this codebase already uses for storage (Supabase vs. local disk)
  and email (Gmail API vs. console logger) — not a new pattern.
- **Two-tier cache for permissions**, not Redis-only: the in-memory `Map` is still checked first
  (an L1 cache in front of Redis as L2), since it's strictly cheaper than a network round trip for
  repeat requests within the same process, and it's still the *only* store when Redis isn't
  configured.
- **`invalidateUserPermissionCache`/`invalidateAllPermissionCache` kept their exact existing
  synchronous (`void`) signatures.** Their Redis-side deletion runs fire-and-forget internally
  (with its own error handling) rather than being awaited by the caller. This was a deliberate
  choice to avoid touching `rbac.service.ts` (their only caller, 8 call sites) at all — converting
  these to `async` would have required updating every call site to `await` them, which is outside
  this pass's file scope. The practical cost is a few milliseconds of eventual consistency for the
  Redis-backed cache on a multi-instance deployment, not a security gap.
- **Redis errors never break a request.** Every Redis call (`get`/`set`/`del`/`keys`) is wrapped so
  a connection failure logs a warning and falls through to the database (permission resolution) or
  the in-memory store (rate limiting), rather than surfacing as a 500.

**Files:** `src/server/shared/redis.client.ts` (new), `src/server/shared/middleware/rate-limit.middleware.ts`,
`src/server/shared/permissions/permission-resolver.service.ts`, `.env.example`,
`docs/module-1-foundation/deployment.md` (one checklist line updated to reflect that this is now
implemented, not still a TODO), `package.json`/`package-lock.json` (added `ioredis`,
`rate-limit-redis`)

**Tests added:** `redis.client.test.ts` (null when unconfigured; singleton construction when
configured; error handler registered), `permission-resolver.service.redis.test.ts` (cache write
reaches Redis with the correct key/TTL; a Redis cache hit skips the database entirely; both
invalidation functions delete the right Redis keys; a Redis read *or* write failure degrades
gracefully instead of throwing).

**What I could not verify:** there's no live Redis instance in this environment, so the
Redis-*connected* code path is verified by type-correctness, code review, and mocked unit tests —
not an end-to-end test against a real Redis server. I'd recommend a smoke test against a real
`REDIS_URL` (e.g. a free Upstash instance) before relying on this in production.

---

## P2-8 — Automated dependency vulnerability scanning

**What:** Added `.github/dependabot.yml` (weekly npm dependency-update PRs) and
`.github/workflows/security-audit.yml` (`npm audit --audit-level=high` on push/PR/weekly schedule).

**Why:** This app depends on `jsonwebtoken`, `bcryptjs`, `express`, and dozens of others — any of
which can get a CVE disclosed after being shipped. Automated scanning catches a known-vulnerable
version without anyone needing to remember to check.

**A real finding surfaced immediately, and here's exactly what I did about it:**
Running `npm audit` before adding the workflow found 4 existing high-severity findings:
- `nanoid` (a transitive dependency of `postcss`/`vite`, dev/build tooling only) — **fixed** via
  the standard, non-breaking `npm audit fix` (no `--force`). Verified via `npm ls nanoid`: this
  bumped only the `vite`-side instance (3.3.16 → 3.3.18); the separate `docx`-side instance was
  already on an unaffected major version (5.x). `package.json` was untouched; only
  `package-lock.json`'s resolved version changed (3 lines). Confirmed safe via full typecheck +
  test suite + production build, all passing.
- `deepmerge-ts` (transitive via `@prisma/config`, which only `prisma` — the CLI, a
  **devDependency**, never bundled into or run by the deployed server process — depends on) —
  **left as-is.** `npm audit fix` had no non-breaking fix available for it; resolving it would mean
  forcing a Prisma version bump I have not evaluated for compatibility with this app's schema/
  migrations, which is exactly the kind of "modify something unrelated without being asked" this
  pass was told to avoid. Given it's confined to build-time tooling (never reachable by a live
  attacker against the deployed app), I judged it not worth that risk in a strictly-scoped pass.

**Decision — the CI check is currently non-blocking (`continue-on-error: true`):** I initially tried
to scope the *blocking* check to production dependencies only via `npm audit --omit=dev`, so the
one remaining (dev-only) finding wouldn't gate CI. Empirically, in this npm version (11.17.0),
`--omit=dev` does **not** reliably exclude a devDependency-only vulnerable subtree from the audit
report — I verified this directly rather than assuming it worked. Rather than build something
fragile around that npm behavior, the workflow currently reports findings without failing the
build. **This should be flipped to blocking** (remove `continue-on-error: true`) once `npm audit
--audit-level=high` is clean — the workflow file has a comment marking exactly this.

**Files:** `.github/dependabot.yml` (new), `.github/workflows/security-audit.yml` (new),
`package-lock.json` (the `npm audit fix`, see above)

---

## P2-9 — Support a previous `JWT_ACCESS_SECRET` during rotation

**What:** Added an optional `JWT_ACCESS_SECRET_PREVIOUS` env var. `verifyAccessToken()` tries the
current secret first; if that fails *and* a previous secret is configured, it retries against that
one before giving up.

**Why:** Without this, rotating `JWT_ACCESS_SECRET` — something you should do periodically, and
*must* do immediately if it's ever suspected of leaking — instantly invalidates every currently-
logged-in user's access token. That's not a security problem, but it makes rotation disruptive
enough that it's tempting to put off, which *is* a security problem (a leaked secret staying
useful for longer than necessary). This turns rotation into: set `JWT_ACCESS_SECRET_PREVIOUS` to
the old value, set `JWT_ACCESS_SECRET` to the new one, deploy, and remove the "previous" var again
once `JWT_ACCESS_TTL` (15 minutes) has passed — no mass logout in between.

**Files:** `src/server/shared/utils/jwt.util.ts`, `src/server/shared/config/env.ts`, `.env.example`

**Tests added:** `jwt.util.security.test.ts` — a token signed with the "previous" secret verifies
successfully once that secret is configured; a token signed with neither current nor previous is
still rejected; with no previous secret configured (the default), the fallback path is inert and
every token from an old secret is rejected exactly as before this change.

---

## P2-6 — Mandatory 2FA for privileged roles (DEFERRED — not implemented in this pass)

This was the highest-leverage item on the original roadmap, and I want to be upfront about why it
isn't done here rather than force a partial version in.

**Why it's genuinely different from everything else on this list:** every other item above is a
hardening change to *existing* logic/config with no new user-facing behavior. This one is a new
*feature* with a new user-facing flow: a login attempt from a role that requires 2FA, by a user who
hasn't enrolled yet, needs to be blocked with a path forward — not just rejected. That requires, at
minimum:
- A new Tenant-level setting (schema change + migration) for which roles require 2FA.
- New login-flow logic distinguishing "please verify your already-enrolled 2FA" (today's existing
  `requiresTwoFactor: true` response) from "you don't have 2FA yet, but your role requires it
  before you can proceed" (a state that doesn't exist today).
- A new client-side screen/flow to actually walk that user through mandatory enrollment before
  granting them a session.
- A UI on the tenant settings page to let an admin turn this on per-role.

That's schema + migration + two services + at least one new client page — well past "strictly this
finding only, don't touch other files," and it embeds product decisions (is there a grace period?
what does the forced-enrollment screen say? can SUPER_ADMIN exempt themselves?) that aren't mine to
make silently. I'd rather deliver everything else cleanly than deliver this half-considered.

**Recommended next step:** tell me the UX you want for the forced-enrollment moment (e.g. "block
login entirely and show a 'set up 2FA now' screen" vs. "allow one grace login with a persistent
banner") and which roles should be covered by default, and I'll scope and implement it as its own
focused pass.

---

## Verification performed

| Check | Result |
|---|---|
| Server typecheck | ✅ |
| Client typecheck | ✅ (sanity check — no client files touched) |
| Server test suite | ✅ 603/603 (64 files) — 588 pre-existing + 15 new |
| Client test suite | not re-run in full this pass (no client files touched; last known state: 242/242) |
| Production client build | ✅ (sanity check — no client files touched) |

Nothing was committed or pushed.
