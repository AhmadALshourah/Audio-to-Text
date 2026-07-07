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

function isSupportedAudioFormat(ext: string): ext is SupportedAudioFormat {
  return (AUDIO_CONSTRAINTS.SUPPORTED_FORMATS as readonly string[]).includes(ext);
}

export type AudioUploadIssue =
  | { code: 'empty_name' }
  | { code: 'empty_file' }
  | { code: 'too_large'; maxBytes: number }
  | { code: 'unsupported_format'; extension: string; supported: readonly string[] };

/**
 * Pure predicate shared by client and server: the one place the upload rules
 * (format, size) are actually checked. Server (packages/core/src/validation.ts)
 * and client (the dashboard dropzone) both call this and layer their own
 * messaging/i18n on top — so the two can never drift on what's *allowed*.
 */
export function checkAudioUpload(
  fileName: string,
  sizeBytes: number,
): { ok: true; extension: SupportedAudioFormat } | { ok: false; issue: AudioUploadIssue } {
  if (!fileName || fileName.trim().length === 0) {
    return { ok: false, issue: { code: 'empty_name' } };
  }
  if (sizeBytes <= 0) {
    return { ok: false, issue: { code: 'empty_file' } };
  }
  if (sizeBytes > AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      issue: { code: 'too_large', maxBytes: AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES },
    };
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!isSupportedAudioFormat(extension)) {
    return {
      ok: false,
      issue: {
        code: 'unsupported_format',
        extension,
        supported: AUDIO_CONSTRAINTS.SUPPORTED_FORMATS,
      },
    };
  }

  return { ok: true, extension };
}

/** Max times the polling worker retries a failed transcription before giving up. */
export const MAX_TRANSCRIPTION_ATTEMPTS = 2;

/** One timed chunk of a transcript, as returned by Whisper's verbose_json response. */
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}
