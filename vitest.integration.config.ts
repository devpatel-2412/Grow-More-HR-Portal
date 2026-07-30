import { defineConfig } from 'vitest/config';

/**
 * Separate config for integration tests: real Express app + real Postgres, no mocks.
 * Requires a reachable, migrated DATABASE_URL. See auth.routes.integration.test.ts header
 * for the exact setup commands.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/server/**/*.integration.test.ts'],
    hookTimeout: 30_000,
    testTimeout: 15_000,
    // No fixed pool: integration tests share one Postgres connection pool and must not
    // run test files concurrently against the same database.
    fileParallelism: false,
  },
});
