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

export * from '@prisma/client';
