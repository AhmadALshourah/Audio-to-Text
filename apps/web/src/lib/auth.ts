import { prisma } from '@audio-to-text/db';
import { UnauthorizedError } from '@audio-to-text/core';

/**
 * Resolve the current user's database id.
 *
 * ⚠️ Phase 4 seam — auth is NOT wired yet. In development this resolves to the
 * seeded demo user so the API can be exercised end-to-end. Phase 5 replaces the
 * body with Clerk:
 *
 *   const { userId: clerkId } = auth();
 *   if (!clerkId) throw new UnauthorizedError();
 *   ...map clerkId -> User.id (provisioned via the Clerk webhook)...
 *
 * In production this throws until Clerk is in place, so nothing insecure ships.
 */
export async function requireUserId(): Promise<string> {
  if (process.env.NODE_ENV === 'production') {
    throw new UnauthorizedError('Auth is not configured yet (Phase 5).');
  }

  const devClerkId = process.env.DEV_USER_CLERK_ID ?? 'seed_demo_user';
  const user = await prisma.user.findUnique({ where: { clerkId: devClerkId } });
  if (!user) {
    throw new UnauthorizedError(
      `Dev user "${devClerkId}" not found. Run \`pnpm --filter @audio-to-text/db db:seed\`.`,
    );
  }
  return user.id;
}
