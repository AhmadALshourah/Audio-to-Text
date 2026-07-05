/**
 * Shared domain types used across web + worker.
 * Keep these framework-agnostic (no Prisma / React imports).
 */

export const TRANSCRIPTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export type TranscriptionStatus = (typeof TRANSCRIPTION_STATUS)[keyof typeof TRANSCRIPTION_STATUS];

export const SUBSCRIPTION_PLAN = {
  FREE: 'free',
  PRO: 'pro',
} as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];

/** Narrow a raw DB string (SQLite stores plans as text) to a SubscriptionPlan. */
export function toSubscriptionPlan(value: string | null | undefined): SubscriptionPlan {
  return value === SUBSCRIPTION_PLAN.PRO ? SUBSCRIPTION_PLAN.PRO : SUBSCRIPTION_PLAN.FREE;
}

/** Monthly transcription minute allowance per plan. */
export const PLAN_MONTHLY_MINUTES: Record<SubscriptionPlan, number> = {
  [SUBSCRIPTION_PLAN.FREE]: 30,
  [SUBSCRIPTION_PLAN.PRO]: 1000,
};

/** Audio constraints enforced on upload (mirrors Whisper's own limits). */
export const AUDIO_CONSTRAINTS = {
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB (Whisper hard limit)
  SUPPORTED_FORMATS: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'webm', 'mp4', 'mpeg', 'mpga'] as const,
} as const;

export type SupportedAudioFormat = (typeof AUDIO_CONSTRAINTS.SUPPORTED_FORMATS)[number];

/** Max times the polling worker retries a failed transcription before giving up. */
export const MAX_TRANSCRIPTION_ATTEMPTS = 2;
