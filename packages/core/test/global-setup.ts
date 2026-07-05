import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

/**
 * Runs once before the whole `packages/core` test suite (Vitest globalSetup,
 * not per test file). Pushes the Prisma schema to a throwaway SQLite file so
 * integration tests exercise a real database — no mocking the ORM — without
 * touching the developer's `dev.db`. Cleaned up in the returned teardown.
 */
const dbDir = path.resolve(fileURLToPath(import.meta.url), '../../../db');
const uploadsDir = path.resolve(fileURLToPath(import.meta.url), '../../.tmp-test-uploads');

export async function setup(): Promise<() => Promise<void>> {
  await mkdir(uploadsDir, { recursive: true });

  execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
    cwd: dbDir,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'inherit',
  });

  return async () => {
    await rm(path.join(dbDir, 'prisma', 'test.db'), { force: true });
    await rm(path.join(dbDir, 'prisma', 'test.db-journal'), { force: true });
    await rm(uploadsDir, { recursive: true, force: true });
  };
}
