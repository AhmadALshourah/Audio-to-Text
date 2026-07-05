import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@audio-to-text/shared/crypto';

const prisma = new PrismaClient();

/**
 * Idempotent seed: one demo user with a free subscription.
 * Login: demo@audio-to-text.local / demo1234
 */
async function main(): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const user = await prisma.user.upsert({
    where: { email: 'demo@audio-to-text.local' },
    update: {},
    create: {
      email: 'demo@audio-to-text.local',
      name: 'Demo User',
      passwordHash: hashPassword('demo1234'),
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
