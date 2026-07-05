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
