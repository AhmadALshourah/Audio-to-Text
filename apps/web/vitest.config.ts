import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      // Importing @audio-to-text/core pulls in @audio-to-text/db, whose
      // singleton fires (caught, best-effort) PRAGMA calls at import time.
      // Nothing here actually queries the database — this just keeps that
      // noise out of the test log.
      DATABASE_URL: 'file:./test.db',
    },
  },
});
