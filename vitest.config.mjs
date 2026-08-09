import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'app'),
      '@lib': path.resolve(import.meta.dirname, 'app/_lib'),
      '@components': path.resolve(import.meta.dirname, 'app/_components'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: [
        'app/_lib/validator.ts',
        'app/_lib/currency.ts',
        'app/_lib/utils.ts',
        'app/_lib/seeder.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
      },
    },
  },
});
