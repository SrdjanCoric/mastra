import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**', 'src/web/**', 'src/**/*.d.ts'],
      thresholds: {
        statements: 59,
        branches: 53,
        functions: 59,
        lines: 60,
      },
    },
    projects: [
      {
        test: {
          name: 'unit:mastracode',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          setupFiles: ['src/__tests__/vitest-setup.ts'],
          maxConcurrency: 1,
          fileParallelism: false,
          isolate: true,
          env: {
            FORCE_COLOR: '1',
            TERM: 'dumb',
          },
        },
      },
    ],
  },
});
