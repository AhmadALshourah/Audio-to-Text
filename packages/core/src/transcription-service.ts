import { prisma, type Transcription } from '@audio-to-text/db';
import { NotFoundError } from './errors.js';
import { validateAudioUpload } from './validation.js';
import { assertQuotaAvailable } from './quota.js';
import { transcribeAudio } from './whisper.js';
import { enqueueTranscriptionJob } from './queue.js';

export interface CreateTranscriptionInput {
  fileName: string;
  sizeBytes: number;
}

/**
 * Validate the upload, check quota, persist a `pending` record (with the raw
 * audio bytes attached — see the schema note on `audioData`), and enqueue a
 * job for the worker to pick up. Returns immediately; the caller polls
 * {@link getTranscription} for status updates.
 */
export async function createTranscription(
  userId: string,
  input: CreateTranscriptionInput,
  audioData: Buffer,
): Promise<Transcription> {
  validateAudioUpload(input);
  await assertQuotaAvailable(userId);

  const record = await prisma.transcription.create({
    data: {
      userId,
      status: 'pending',
      fileName: input.fileName,
      fileSizeBytes: input.sizeBytes,
      audioData,
    },
  });

  await enqueueTranscriptionJob({ transcriptionId: record.id });

  return record;
}

/**
 * Load the audio bytes stored for a pending job. Called by the worker after
 * dequeuing — keeps the queue payload to a bare id instead of carrying audio.
 */
export async function fetchTranscriptionAudio(
  transcriptionId: string,
): Promise<{ fileName: string; audioData: Buffer }> {
  const record = await prisma.transcription.findUnique({
    where: { id: transcriptionId },
    select: { fileName: true, audioData: true },
  });
  if (!record?.audioData) {
    throw new NotFoundError(`Transcription ${transcriptionId} has no pending audio data.`);
  }
  return { fileName: record.fileName, audioData: record.audioData };
}

/**
 * Drop the stored audio bytes for a job that has permanently failed (no more
 * BullMQ retries left). Safe to call even if already cleared.
 */
export async function clearTranscriptionAudio(transcriptionId: string): Promise<void> {
  await prisma.transcription.updateMany({
    where: { id: transcriptionId },
    data: { audioData: null },
  });
}

/**
 * Run Whisper on the given audio bytes for an existing transcription, then
 * atomically persist the result and log usage. Marks the record `failed`
 * (and rethrows) if transcription errors out — but does NOT clear the stored
 * audio bytes on failure, since BullMQ may retry the same job and needs them
 * again (see {@link fetchTranscriptionAudio}). Call {@link clearTranscriptionAudio}
 * once retries are exhausted.
 */
export async function processTranscription(
  transcriptionId: string,
  audioData: Buffer | Uint8Array,
): Promise<Transcription> {
  const record = await prisma.transcription.findUnique({ where: { id: transcriptionId } });
  if (!record) throw new NotFoundError('Transcription not found');

  await prisma.transcription.update({
    where: { id: transcriptionId },
    data: { status: 'processing' },
  });

  try {
    const result = await transcribeAudio(audioData, record.fileName);

    const [updated] = await prisma.$transaction([
      prisma.transcription.update({
        where: { id: transcriptionId },
        data: {
          status: 'done',
          text: result.text,
          durationSeconds: result.durationSeconds,
          language: result.language,
          costUsd: result.costUsd,
          completedAt: new Date(),
          audioData: null,
        },
      }),
      prisma.usageLog.create({
        data: {
          userId: record.userId,
          transcriptionId,
          seconds: result.durationSeconds,
        },
      }),
    ]);

    return updated;
  } catch (err) {
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      },
    });
    throw err;
  }
}

/** Fetch one transcription, enforcing that it belongs to the user. */
export async function getTranscription(userId: string, id: string): Promise<Transcription> {
  const record = await prisma.transcription.findUnique({ where: { id } });
  if (!record || record.userId !== userId) {
    throw new NotFoundError('Transcription not found');
  }
  return record;
}

/** List a user's transcriptions, newest first. */
export async function listTranscriptions(
  userId: string,
  opts: { limit?: number } = {},
): Promise<Transcription[]> {
  return prisma.transcription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 50,
  });
}
