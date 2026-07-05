import { prisma, type Transcription } from '@audio-to-text/db';
import { MAX_TRANSCRIPTION_ATTEMPTS } from '@audio-to-text/shared';
import { NotFoundError } from './errors.js';
import { validateAudioUpload } from './validation.js';
import { assertQuotaAvailable } from './quota.js';
import { transcribeAudio } from './whisper.js';
import { saveAudio, readAudio, deleteAudio } from './storage.js';

export interface CreateTranscriptionInput {
  fileName: string;
  sizeBytes: number;
}

/**
 * Validate the upload, check quota, write the audio to local storage, and
 * persist a `pending` record pointing at it. Returns immediately; the polling
 * worker picks the job up. The caller polls {@link getTranscription} for status.
 */
export async function createTranscription(
  userId: string,
  input: CreateTranscriptionInput,
  audioData: Buffer,
): Promise<Transcription> {
  const { extension } = validateAudioUpload(input);
  await assertQuotaAvailable(userId);

  const record = await prisma.transcription.create({
    data: {
      userId,
      status: 'pending',
      fileName: input.fileName,
      fileSizeBytes: input.sizeBytes,
    },
  });

  // Store the audio under the record id, then link it. If the write fails we
  // mark the job failed rather than leaving a stuck `pending` row.
  try {
    const audioPath = await saveAudio(record.id, extension, audioData);
    return prisma.transcription.update({
      where: { id: record.id },
      data: { audioPath },
    });
  } catch (err) {
    await prisma.transcription.update({
      where: { id: record.id },
      data: { status: 'failed', errorMessage: 'Failed to store the uploaded audio.' },
    });
    throw err;
  }
}

/**
 * Atomically claim the oldest unclaimed `pending` job for processing. Returns
 * the claimed record, or null if there's nothing to do. The conditional
 * updateMany (status still `pending`) makes the claim safe even if several
 * worker loops race.
 */
export async function claimNextTranscription(): Promise<Transcription | null> {
  const candidate = await prisma.transcription.findFirst({
    where: { status: 'pending', audioPath: { not: null } },
    orderBy: { createdAt: 'asc' },
  });
  if (!candidate) return null;

  const claimed = await prisma.transcription.updateMany({
    where: { id: candidate.id, status: 'pending' },
    data: { status: 'processing', attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return null; // lost the race; another loop got it

  return prisma.transcription.findUnique({ where: { id: candidate.id } });
}

/**
 * Run Whisper on a claimed transcription, then atomically persist the result
 * and log usage, and delete the stored audio (we keep only the text). On
 * failure, either requeue for another attempt (back to `pending`) or mark it
 * permanently `failed` once attempts are exhausted — deleting the audio then too.
 */
export async function processTranscription(record: Transcription): Promise<void> {
  if (!record.audioPath) {
    await prisma.transcription.update({
      where: { id: record.id },
      data: { status: 'failed', errorMessage: 'Audio file is missing.' },
    });
    return;
  }

  try {
    const audioData = await readAudio(record.audioPath);
    const result = await transcribeAudio(audioData, record.fileName);

    await prisma.$transaction([
      prisma.transcription.update({
        where: { id: record.id },
        data: {
          status: 'done',
          text: result.text,
          durationSeconds: result.durationSeconds,
          language: result.language,
          costUsd: result.costUsd,
          completedAt: new Date(),
          audioPath: null,
        },
      }),
      prisma.usageLog.create({
        data: {
          userId: record.userId,
          transcriptionId: record.id,
          seconds: result.durationSeconds,
        },
      }),
    ]);

    await deleteAudio(record.audioPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const giveUp = record.attempts >= MAX_TRANSCRIPTION_ATTEMPTS;

    await prisma.transcription.update({
      where: { id: record.id },
      // Requeue for retry (`pending`) unless we've hit the attempt limit.
      data: giveUp
        ? { status: 'failed', errorMessage: message, audioPath: null }
        : { status: 'pending', errorMessage: message },
    });

    if (giveUp) await deleteAudio(record.audioPath);
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
