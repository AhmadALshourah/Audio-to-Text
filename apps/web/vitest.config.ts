import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` -> `./src/*` path alias from tsconfig.json, which
    // Next.js resolves natively but Vitest needs told about explicitly.
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      // Importing @audio-to-text/core pulls in @audio-to-text/db, whose
      // singleton fires (caught, best-effort) PRAGMA calls at import time.
      // Nothing here actually queries the database — this just keeps that
      // noise out of the test log.
      DATABASE_URL: 'file:./test.db',
      // middleware.ts imports '@/env' for its parseEnv() side effect, so
      // these all need to be present just to import the module under test —
      // none of it is actually exercised by these tests.
      OPENAI_API_KEY: 'test-key-unused',
      UPLOADS_DIR: '/tmp/test-uploads',
      RESEND_API_KEY: 'test-key-unused',
      EMAIL_FROM: 'test@example.com',
    },
  },
});
