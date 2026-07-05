import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { TRANSCRIPTION_QUEUE_NAME, type TranscriptionJobData } from '@audio-to-text/shared';

let connection: IORedis | undefined;
let queue: Queue<TranscriptionJobData> | undefined;

/**
 * Lazily create the Redis connection so importing this module never requires
 * REDIS_URL to be present at import time (mirrors the lazy OpenAI client in
 * whisper.ts — keeps `next build` and other module-graph walks side-effect-free).
 */
function getConnection(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL is required to connect to the transcription queue.');
    }
    // BullMQ requires this to be null so it can manage blocking commands itself.
    connection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return connection;
}

function getQueue(): Queue<TranscriptionJobData> {
  queue ??= new Queue<TranscriptionJobData>(TRANSCRIPTION_QUEUE_NAME, {
    connection: getConnection(),
  });
  return queue;
}

/**
 * Enqueue a transcription job. Whisper errors are sometimes transient (rate
 * limits, network blips), so we allow a couple of retries — but not more,
 * since every attempt re-runs (and re-bills) the full transcription.
 */
export async function enqueueTranscriptionJob(data: TranscriptionJobData): Promise<void> {
  await getQueue().add('transcribe', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  });
}
