import { claimNextTranscription, processTranscription } from '@audio-to-text/core';
import { createLogger, logger } from '@audio-to-text/shared/logger';
import { env } from './env.js';

/** How long to wait before polling again when the queue is empty. */
const IDLE_POLL_MS = 2000;

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
