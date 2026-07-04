import { prisma, type Transcription } from '@audio-to-text/db';
import { NotFoundError } from './errors.js';
import { validateAudioUpload } from './validation.js';
import { assertQuotaAvailable } from './quota.js';
import { transcribeAudio } from './whisper.js';

export interface CreateTranscriptionInput {
  fileName: string;
  sizeBytes: number;
}

/**
 * Create a `pending` transcription record after validating the upload and
 * checking the user's quota. Does NOT run Whisper — call {@link processTranscription}
 * (inline for now, via the queue worker in Phase 6).
 */
export async function createTranscription(
  userId: string,
  input: CreateTranscriptionInput,
): Promise<Transcription> {
  validateAudioUpload(input);
  await assertQuotaAvailable(userId);

  return prisma.transcription.create({
    data: {
      userId,
      status: 'pending',
      fileName: input.fileName,
      fileSizeBytes: input.sizeBytes,
    },
  });
}

/**
 * Run Whisper on the given audio bytes for an existing transcription, then
 * atomically persist the result and log usage. Marks the record `failed`
 * (and rethrows) if transcription errors out.
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

/**
 * Convenience for the current synchronous API path: create the record and run
 * Whisper immediately. Phase 6 replaces this with enqueue + worker processing.
 */
export async function createAndProcessTranscription(
  userId: string,
  input: CreateTranscriptionInput,
  audioData: Buffer | Uint8Array,
): Promise<Transcription> {
  const record = await createTranscription(userId, input);
  return processTranscription(record.id, audioData);
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
