import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@audio-to-text/db';
import { getQuotaStatus, assertQuotaAvailable } from './quota.js';
import { QuotaExceededError } from './errors.js';

describe('quota', () => {
  let userId: string;

  beforeAll(async () => {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const user = await prisma.user.create({
      data: {
        email: `quota-test-${Date.now()}@example.com`,
        passwordHash: 'unused-in-this-test',
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
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
  });

  it('starts with the full free-plan allowance unused', async () => {
    const status = await getQuotaStatus(userId);
    expect(status).toEqual({
      plan: 'free',
      limitMinutes: 30,
      usedMinutes: 0,
      remainingMinutes: 30,
    });
  });

  it('does not throw when quota is available', async () => {
    await expect(assertQuotaAvailable(userId)).resolves.toBeUndefined();
  });

  it('subtracts logged usage from the remaining minutes', async () => {
    // Simulate a completed 5-minute (300s) transcription's usage log directly.
    const t = await prisma.transcription.create({
      data: { userId, status: 'done', fileName: 'a.mp3', fileSizeBytes: 100 },
    });
    await prisma.usageLog.create({ data: { userId, transcriptionId: t.id, seconds: 300 } });

    const status = await getQuotaStatus(userId);
    expect(status.usedMinutes).toBe(5);
    expect(status.remainingMinutes).toBe(25);
  });

  it('throws QuotaExceededError once the full allowance is used', async () => {
    // Log enough additional usage to exceed the 30-minute free limit.
    const t = await prisma.transcription.create({
      data: { userId, status: 'done', fileName: 'b.mp3', fileSizeBytes: 100 },
    });
    await prisma.usageLog.create({ data: { userId, transcriptionId: t.id, seconds: 26 * 60 } });

    await expect(assertQuotaAvailable(userId)).rejects.toThrow(QuotaExceededError);
  });
});

describe('quota period rollover', () => {
  let userId: string;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('rolls a lapsed period forward and stops counting old usage against the new one', async () => {
    // A subscription whose period ended a month ago — simulates a user who
    // hasn't been checked since exhausting last period's quota.
    const now = new Date();
    const oldPeriodStart = new Date(now);
    oldPeriodStart.setMonth(oldPeriodStart.getMonth() - 2);
    const oldPeriodEnd = new Date(now);
    oldPeriodEnd.setMonth(oldPeriodEnd.getMonth() - 1);

    const user = await prisma.user.create({
      data: {
        email: `quota-rollover-${Date.now()}@example.com`,
        passwordHash: 'unused-in-this-test',
        subscription: {
          create: {
            plan: 'free',
            status: 'active',
            currentPeriodStart: oldPeriodStart,
            currentPeriodEnd: oldPeriodEnd,
          },
        },
      },
    });
    userId = user.id;

    // Usage logged in the (now-lapsed) old period — used the full allowance.
    const t = await prisma.transcription.create({
      data: { userId, status: 'done', fileName: 'old.mp3', fileSizeBytes: 100 },
    });
    await prisma.usageLog.create({
      data: { userId, transcriptionId: t.id, seconds: 30 * 60, createdAt: oldPeriodStart },
    });

    const status = await getQuotaStatus(userId);

    // The old usage must not count against the freshly-rolled-forward period.
    expect(status.usedMinutes).toBe(0);
    expect(status.remainingMinutes).toBe(30);

    // The subscription row itself must have been advanced, not just the read.
    const updated = await prisma.subscription.findUniqueOrThrow({ where: { userId } });
    expect(updated.currentPeriodStart.getTime()).toBeGreaterThan(oldPeriodStart.getTime());
    expect(updated.currentPeriodEnd.getTime()).toBeGreaterThan(now.getTime());
  });

  it('does not touch a subscription whose current period has not lapsed', async () => {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const user = await prisma.user.create({
      data: {
        email: `quota-no-rollover-${Date.now()}@example.com`,
        passwordHash: 'unused-in-this-test',
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
    userId = user.id;

    await getQuotaStatus(userId);

    const unchanged = await prisma.subscription.findUniqueOrThrow({ where: { userId } });
    expect(unchanged.currentPeriodStart.getTime()).toBe(now.getTime());
    expect(unchanged.currentPeriodEnd.getTime()).toBe(periodEnd.getTime());
  });
});
