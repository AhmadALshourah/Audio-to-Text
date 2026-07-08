import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './test/global-setup.ts',
    env: {
      // Same relative value used everywhere else in the project — Prisma
      // resolves it relative to packages/db/prisma/, giving a throwaway file
      // separate from dev.db (see test/global-setup.ts).
      DATABASE_URL: 'file:./test.db',
      UPLOADS_DIR: path.join(dirname, '.tmp-test-uploads'),
      OPENAI_API_KEY: 'test-key-unused-openai-is-mocked',
      RESEND_API_KEY: 'test-key-unused-resend-is-mocked',
      EMAIL_FROM: 'test@example.com',
    },
    // Integration tests share one SQLite file; running files in parallel
    // processes risks "database is locked" errors, so keep the suite serial.
    fileParallelism: false,
  },
});
