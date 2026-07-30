import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    exclude: ['src/server/**'],
    // jsdom + userEvent is slow, and every test file pays a fresh environment/MSW startup cost.
    // With the suite now spanning a dozen files, the 5s default was being exhausted by scheduling
    // contention rather than by anything the tests do — these two settings keep the wall-clock
    // budget realistic and stop workers from starving each other.
    testTimeout: 20000,
    maxWorkers: 4,
  },
});
