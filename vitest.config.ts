import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://business_os:business_os_dev_password@localhost:5432/business_os_test?schema=public',
      JWT_ACCESS_SECRET: 'test-access-secret-please-do-not-use-in-prod-32chars',
      TWO_FA_ENCRYPTION_KEY: 'zvDrxz2BG0Uu52o+Y4xVWrE86/wobsl6y2xV5i7ktyE=',
    },
    include: ['src/server/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/server/**/*.ts'],
      exclude: ['src/server/**/*.test.ts', 'src/server/db/**', 'src/server/server.ts'],
    },
  },
});
