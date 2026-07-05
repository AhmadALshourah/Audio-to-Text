import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { TRANSCRIPTION_QUEUE_NAME, type TranscriptionJobData } from '@audio-to-text/shared';
import {
  clearTranscriptionAudio,
  fetchTranscriptionAudio,
  processTranscription,
} from '@audio-to-text/core';
import { env } from './env.js';

async function handleJob(job: Job<TranscriptionJobData>): Promise<void> {
  const { transcriptionId } = job.data;
  // eslint-disable-next-line no-console
  console.log(`[job ${job.id}] processing transcription ${transcriptionId}`);

  const { audioData } = await fetchTranscriptionAudio(transcriptionId);
  await processTranscription(transcriptionId, audioData);

  // eslint-disable-next-line no-console
  console.log(`[job ${job.id}] done`);
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`🎧 Audio-to-Text worker starting (env: ${env.NODE_ENV})`);

  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const worker = new Worker<TranscriptionJobData>(TRANSCRIPTION_QUEUE_NAME, handleJob, {
    connection,
    concurrency: 3,
  });

  worker.on('completed', (job) => {
    // eslint-disable-next-line no-console
    console.log(`✅ job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`❌ job ${job?.id} failed:`, err.message);

    // Once every retry is exhausted, stop holding the audio bytes — a further
    // retry will never happen, so there's nothing left to reuse them for.
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 1;
    if (job && attemptsMade >= maxAttempts) {
      void clearTranscriptionAudio(job.data.transcriptionId);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Listening on queue "${TRANSCRIPTION_QUEUE_NAME}"`);

  const shutdown = async (): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log('Shutting down worker...');
    await worker.close();
    connection.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Worker failed to start:', err);
  process.exit(1);
});
