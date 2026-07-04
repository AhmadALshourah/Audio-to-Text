import { prisma, type User } from '@audio-to-text/db';

export interface ClerkUserInput {
  clerkId: string;
  email: string;
  name: string | null;
}

/**
 * Create or update the app's User row for a Clerk account. On first creation
 * a free Subscription is provisioned with a one-month billing window.
 *
 * Called both from the Clerk webhook (production) and lazily on first
 * authenticated request (so local dev works without a webhook tunnel).
 */
export async function upsertUserFromClerk(input: ClerkUserInput): Promise<User> {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return prisma.user.upsert({
    where: { clerkId: input.clerkId },
    update: { email: input.email, name: input.name },
    create: {
      clerkId: input.clerkId,
      email: input.email,
      name: input.name,
      subscription: {
        create: {
          plan: 'free',
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      },
    },
  });
}

/** Remove a user (and, via cascade, their subscription/transcriptions/usage). */
export async function deleteUserByClerkId(clerkId: string): Promise<void> {
  // deleteMany so a missing user is a no-op rather than an error.
  await prisma.user.deleteMany({ where: { clerkId } });
}
