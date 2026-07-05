import { prisma } from '@audio-to-text/db';
import {
  PLAN_MONTHLY_MINUTES,
  toSubscriptionPlan,
  type SubscriptionPlan,
} from '@audio-to-text/shared';
import { QuotaExceededError } from './errors.js';

export interface QuotaStatus {
  plan: SubscriptionPlan;
  limitMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
}

/**
 * Compute a user's transcription usage for their current billing period.
 * Usage is the sum of UsageLog seconds since the subscription's period start.
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  // A user without a subscription row is treated as a free plan with a fresh period.
  const plan: SubscriptionPlan = toSubscriptionPlan(subscription?.plan);
  const periodStart = subscription?.currentPeriodStart ?? startOfCurrentMonth();

  const aggregate = await prisma.usageLog.aggregate({
    where: { userId, createdAt: { gte: periodStart } },
    _sum: { seconds: true },
  });

  const usedMinutes = (aggregate._sum.seconds ?? 0) / 60;
  const limitMinutes = PLAN_MONTHLY_MINUTES[plan];

  return {
    plan,
    limitMinutes,
    usedMinutes: round2(usedMinutes),
    remainingMinutes: round2(Math.max(0, limitMinutes - usedMinutes)),
  };
}

/**
 * Guard called before starting a transcription. We reject only when the user
 * has already reached their limit; the in-flight job is allowed to finish even
 * if it tips slightly over (actual seconds are unknown until Whisper runs).
 */
export async function assertQuotaAvailable(userId: string): Promise<void> {
  const { remainingMinutes, limitMinutes } = await getQuotaStatus(userId);
  if (remainingMinutes <= 0) {
    throw new QuotaExceededError(
      `You have used your full monthly allowance of ${limitMinutes} minutes. Upgrade to continue.`,
    );
  }
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
