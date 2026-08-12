# AGENTS.md — Development & Quality Guidelines for HR Portal

## Core Principles
1. **Verify Before Edit**: Always check existing codebase implementations, test coverage (`npm test`), and type safety (`npm run typecheck:client` & `npm run typecheck:server`) before touching any file.
2. **Minimal & Surgical Diffs**: Do NOT perform unneeded changes, reformatting, or mass rewrites. Keep changes targeted strictly to the bug or feature at hand.
3. **Preserve API Contracts & RBAC**: Never alter endpoint contracts, permission resolution mechanisms, or Prisma models without explicit multi-layer checks.
4. **Zero Ignored Failures**: Treat test failures or TypeScript compilation issues as immediate blocking items.
5. **Accessibility & Responsive First**: Ensure UI components support dark/light mode (`ThemeToggle`), keyboard navigation, screen reader focus, and mobile viewports.

## Repository Architecture Overview
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS v4 + React Router v7 (`src/routes/router.tsx`) + Radix UI + Lucide React.
- **Backend**: Express + Prisma ORM + PostgreSQL / Supabase + Zod validation + Rate Limiting + Pinot/Structured Logging.
- **State & Data**: React Query (`@tanstack/react-query`) + Custom AuthContext (`src/modules/auth/context/AuthContext.tsx`).
- **Testing**: Vitest (`vitest.config.ts`, `vitest.client.config.ts`, `vitest.integration.config.ts`).

## Pre-Flight Checklist Before Making Changes
- [ ] Read `IMPLEMENTATION_PLAN.md` phase objectives.
- [ ] Run `npm run typecheck:client` and `npm run typecheck:server`.
- [ ] Run `npm test` to confirm baseline test suite passes (521/521 tests).
- [ ] Check target file path and line numbers using `view_file` or `grep_search`.

## Execution Protocol
- Implement changes phase by phase.
- Re-run type checks and vitest after each modification.
- Document any updated tests or newly added edge-case handlers in `walkthrough.md`.
