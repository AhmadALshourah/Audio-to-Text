import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@audio-to-text/db';
import { UnauthorizedError, upsertUserFromClerk } from '@audio-to-text/core';

/**
 * Resolve the current user's database id from the Clerk session.
 *
 * If the user is signed in but has no DB row yet (the Clerk webhook hasn't
 * fired — always the case in local dev), we provision them lazily from their
 * Clerk profile so the first request just works.
 */
export async function requireUserId(): Promise<string> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new UnauthorizedError();
  }

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) {
    return existing.id;
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new UnauthorizedError('Clerk account has no email address.');
  }

  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null;
  const user = await upsertUserFromClerk({ clerkId, email, name });
  return user.id;
}
