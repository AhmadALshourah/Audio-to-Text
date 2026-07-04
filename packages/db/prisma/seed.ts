import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Idempotent seed: creates one demo user with a free subscription.
 * Safe to run repeatedly (upsert on the unique clerkId).
 */
async function main(): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const user = await prisma.user.upsert({
    where: { clerkId: 'seed_demo_user' },
    update: {},
    create: {
      clerkId: 'seed_demo_user',
      email: 'demo@audio-to-text.local',
      name: 'Demo User',
      subscription: {
        create: {
          plan: 'free',
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      },
    },
    include: { subscription: true },
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Seeded user ${user.email} (${user.subscription?.plan} plan)`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
