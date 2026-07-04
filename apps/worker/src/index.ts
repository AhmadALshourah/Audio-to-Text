import { env } from './env.js';

/**
 * Worker entry point.
 *
 * Phase 2: boots and validates its environment.
 * Phase 6: will attach a BullMQ Worker that consumes transcription jobs,
 *          calls the Whisper API, and updates the Transcription record.
 */
async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`🎧 Audio-to-Text worker starting (env: ${env.NODE_ENV})`);
  // eslint-disable-next-line no-console
  console.log('✅ Environment validated. Queue processing wired up in Phase 6.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Worker failed to start:', err);
  process.exit(1);
});
