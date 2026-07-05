import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client.
 *
 * In development, Next.js hot-reload can create many client instances and
 * exhaust the database connection pool, so we cache the client on `globalThis`.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// SQLite is accessed by two processes (web + worker). WAL mode lets readers and
// a writer work concurrently, and a busy_timeout makes brief lock contention
// wait-and-retry instead of throwing "database is locked". Fire-and-forget.
// Both PRAGMAs return a row (the resulting value), so they must use queryRaw.
void prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;').catch(() => {});
void prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;').catch(() => {});

export * from '@prisma/client';
