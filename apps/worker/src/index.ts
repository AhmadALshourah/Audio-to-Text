import {
  claimNextTranscription,
  processTranscription,
  reclaimStaleProcessingJobs,
  cleanupExpiredAuthRecords,
} from '@audio-to-text/core';
import { createLogger, logger } from '@audio-to-text/shared/logger';
import { env } from './env.js';

/** How long to wait before polling again when the queue is empty. */
const IDLE_POLL_MS = 2000;

/**
 * How often to sweep for jobs stuck in `processing` because the worker that
 * claimed them died mid-job. Runs on every loop iteration once due, regardless
 * of whether there was other work — a dead worker means no other loop is
 * generating activity that would otherwise trigger this.
 */
const RECLAIM_INTERVAL_MS = 5 * 60 * 1000;
let lastReclaimAt = 0;

async function reclaimIfDue(): Promise<void> {
  if (Date.now() - lastReclaimAt < RECLAIM_INTERVAL_MS) return;
  lastReclaimAt = Date.now();

  try {
    const count = await reclaimStaleProcessingJobs();
    if (count > 0) {
      logger.warn('Reclaimed stale processing jobs', { count });
    }
  } catch (err) {
    logger.error('Failed to reclaim stale processing jobs', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * How often to sweep expired sessions and password-reset/email-verification
 * tokens. These are otherwise only ever cleaned up lazily (a session is
 * deleted only when someone tries to use an expired one), so an abandoned
 * browser or an unclicked email link leaves a row behind forever.
 */
const AUTH_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let lastAuthCleanupAt = 0;

async function cleanupAuthRecordsIfDue(): Promise<void> {
  if (Date.now() - lastAuthCleanupAt < AUTH_CLEANUP_INTERVAL_MS) return;
  lastAuthCleanupAt = Date.now();

  try {
    const count = await cleanupExpiredAuthRecords();
    if (count > 0) {
      logger.info('Cleaned up expired sessions/tokens', { count });
    }
  } catch (err) {
    logger.error('Failed to clean up expired sessions/tokens', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Rolling window used to flag an unusually high failure rate or cost. */
const ANOMALY_WINDOW_SIZE = 10;
const FAILURE_RATE_ALERT_THRESHOLD = 0.5; // warn if >= 50% of the last N jobs failed
const SINGLE_JOB_COST_ALERT_USD = 0.5; // warn if one job's Whisper cost looks abnormally high

const recentOutcomes: Array<{ status: string; costUsd: number | null }> = [];

function recordOutcome(status: string, costUsd: number | null): void {
  recentOutcomes.push({ status, costUsd });
  if (recentOutcomes.length > ANOMALY_WINDOW_SIZE) recentOutcomes.shift();

  if (costUsd !== null && costUsd >= SINGLE_JOB_COST_ALERT_USD) {
    logger.warn('Anomalously expensive transcription', { costUsd });
  }

  if (recentOutcomes.length === ANOMALY_WINDOW_SIZE) {
    const failed = recentOutcomes.filter((o) => o.status === 'failed').length;
    const failureRate = failed / ANOMALY_WINDOW_SIZE;
    if (failureRate >= FAILURE_RATE_ALERT_THRESHOLD) {
      logger.warn('High failure rate in recent transcriptions', {
        failureRate,
        window: ANOMALY_WINDOW_SIZE,
      });
    }
  }
}

let running = true;

async function loop(): Promise<void> {
  while (running) {
    let didWork = false;
    try {
      await reclaimIfDue();
      await cleanupAuthRecordsIfDue();
      const job = await claimNextTranscription();
      if (job) {
        didWork = true;
        const jobLog = createLogger({ jobId: job.id, fileName: job.fileName });
        const startedAt = Date.now();
        jobLog.info('Processing transcription', { attempt: job.attempts });

        const result = await processTranscription(job);
        const elapsedMs = Date.now() - startedAt;

        jobLog.info('Transcription finished', {
          status: result.status,
          elapsedMs,
          audioDurationSeconds: result.durationSeconds,
          costUsd: result.costUsd,
        });
        recordOutcome(result.status, result.costUsd);
      }
    } catch (err) {
      logger.error('Worker loop error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Busy-drain the queue; only sleep when there was nothing to do.
    if (!didWork) await sleep(IDLE_POLL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

logger.info('Worker starting', { env: env.NODE_ENV });

const shutdown = (): void => {
  logger.info('Worker shutting down');
  running = false;
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

loop().catch((err) => {
  logger.error('Worker crashed', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
