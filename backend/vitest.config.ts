import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
      ALLOW_DEMO_MODE: 'true',
      ADMIN_TOKEN: 'test-admin-token',
    },
    fileParallelism: false,
  },
});
