# Module 1 — Folder Structure Convention

This is the pattern every future feature module (HRMS, ATS, Projects, Finance, ...) follows on
both sides of the stack. "Module" is used as the shared vocabulary term for both — a backend
module and a frontend module for the same domain are meant to mirror each other.

## Backend — `src/server/`

```
src/server/
  modules/
    <feature>/
      <feature>.routes.ts       # HTTP wiring only — no business logic
      <feature>.controller.ts   # req/res mapping, calls the service, shapes the response
      <feature>.service.ts      # business logic — the ONLY thing other modules may import
      <feature>.repository.ts   # thin Prisma query wrapper, narrow intention-revealing methods
      <feature>.validators.ts   # Zod schemas for every endpoint in this module
      <feature>.types.ts        # module-local types (optional)
      <feature>.service.test.ts               # unit tests, repository mocked
      <feature>.routes.integration.test.ts    # HTTP tests against a real DB (optional per module)
  shared/
    middleware/    # auth, rbac, rate-limit, validate, error, request-logger, tenant-scope
    errors/        # AppError and its subtypes
    utils/         # hash, jwt, pagination, response, encryption, duration, async-handler
    permissions/   # the cross-module permission catalogue
    config/        # env.ts — the single source of truth for process.env
    email/         # EmailService interface + dev implementation
    logger.ts
  db/
    prisma.ts      # the one PrismaClient singleton
  app.ts            # assembles the Express app (middleware, routes, error handler)
  server.ts         # http.listen bootstrap + graceful shutdown
```

**Rule**: a module may import another module's `*.service.ts`, never its `*.repository.ts` or
raw Prisma calls. This is what "modules communicate via services, not direct DB coupling"
means in practice — even though every module shares one physical Postgres database, the
repository layer stays private to its own module.

## Frontend — `src/`

```
src/
  modules/
    <feature>/
      api/            # <feature>.api.ts — a pure, mockable fetch layer over shared/lib/api-client
      hooks/           # TanStack Query hooks (mutations/queries), cache keys live here
      components/      # presentational + form components specific to this module
      pages/            # route-level components
      context/          # module-scoped React context, if needed (e.g. AuthContext)
      schemas/          # Zod schemas for client-side form validation
      types/            # module-local TypeScript types
  shared/
    components/
      ui/       # hand-built primitives (button, input, label, card, input-otp) — shadcn-style
                # conventions (cva variants, Radix primitives, cn() utility) without the shadcn
                # CLI, since Tailwind v4 + CLI compatibility wasn't verified for this repo
      layout/   # AppShell, ProtectedRoute, RoleGate
      feedback/ # LoadingSkeleton, EmptyState, ErrorState
    hooks/      # cross-module hooks (useDebounce, usePagination, ...) — none yet in Module 1
    lib/        # api-client.ts, query-client.ts, theme.tsx
    utils/      # cn.ts
  routes/
    router.tsx  # the single React Router route tree
  test/         # renderWithProviders, msw handlers/server, jsdom setup
  App.tsx        # provider composition (QueryClient, Theme, Auth, Router, Toaster)
  main.tsx
```

**Why `hooks/` and `api/` are split per module** instead of one flat services file: it keeps
TanStack Query concerns (cache keys, invalidation) colocated with the module that owns them,
while `*.api.ts` stays a pure, independently-mockable fetch layer — mirroring the backend's
controller/service split.

## Adding a new module

1. Design its DB schema (add models/enums to `prisma/schema.prisma`, migrate).
2. Design its API (routes/controller/service/repository/validators, following the pattern above).
3. Design its UI (api/hooks/components/pages/schemas/types, following the pattern above).
4. Wire routes into `src/server/app.ts` and pages into `src/routes/router.tsx`.
5. Write tests alongside the code, not after.
6. Add a `docs/module-N-<name>/` folder with the same five documents as this one.
