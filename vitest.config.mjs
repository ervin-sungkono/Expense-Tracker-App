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
    setupFiles: ['./tests/setup.js'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: [
        'app/_lib/validator.js',
        'app/_lib/currency.js',
        'app/_lib/utils.js',
        'app/_lib/seeder.js',
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
