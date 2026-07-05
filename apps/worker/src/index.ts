import { claimNextTranscription, processTranscription } from '@audio-to-text/core';
import { env } from './env.js';

/** How long to wait before polling again when the queue is empty. */
const IDLE_POLL_MS = 2000;

let running = true;

async function loop(): Promise<void> {
  while (running) {
    let didWork = false;
    try {
      const job = await claimNextTranscription();
      if (job) {
        didWork = true;
        // eslint-disable-next-line no-console
        console.log(`[${job.id}] processing "${job.fileName}" (attempt ${job.attempts})`);
        await processTranscription(job);
        // eslint-disable-next-line no-console
        console.log(`[${job.id}] finished`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Worker loop error:', err);
    }

    // Busy-drain the queue; only sleep when there was nothing to do.
    if (!didWork) await sleep(IDLE_POLL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// eslint-disable-next-line no-console
console.log(`🎧 Audio-to-Text worker polling for jobs (env: ${env.NODE_ENV})`);

const shutdown = (): void => {
  // eslint-disable-next-line no-console
  console.log('Shutting down worker...');
  running = false;
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

loop().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Worker crashed:', err);
  process.exit(1);
});
