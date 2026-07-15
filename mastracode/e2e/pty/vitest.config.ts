import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'mc-e2e-real-pty',
    environment: 'node',
    include: ['e2e/pty/**/*.test.ts'],
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 45_000,
    hookTimeout: 30_000,
  },
});
