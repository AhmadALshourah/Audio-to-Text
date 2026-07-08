import { prisma, type Transcription } from '@audio-to-text/db';
import {
  MAX_TRANSCRIPTION_ATTEMPTS,
  STALE_PROCESSING_MS,
  type TranscriptSegment,
} from '@audio-to-text/shared';
import { NotFoundError, ValidationError } from './errors.js';
import { validateAudioUpload, assertAudioContent } from './validation.js';
import { assertQuotaAvailable } from './quota.js';
import { transcribeAudio } from './whisper.js';
import { saveAudio, readAudio, deleteAudio } from './storage.js';
import { toSrt, toVtt } from './subtitles.js';

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
  assertAudioContent(audioData);
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
 * Reclaim jobs stuck in `processing` because the worker that claimed them
 * died mid-job (crash, OOM, hard kill) without ever reaching the success or
 * failure path in {@link processTranscription} — which is the only place a
 * `processing` row would otherwise move on. Anything still `processing` past
 * {@link STALE_PROCESSING_MS} is put back to `pending` so another worker pass
 * can retry it (or give up, once {@link MAX_TRANSCRIPTION_ATTEMPTS} is hit, the
 * same as any other failure). Returns the number of jobs reclaimed.
 */
export async function reclaimStaleProcessingJobs(): Promise<number> {
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
  const errorMessage = 'Reclaimed after an interrupted processing attempt (worker did not finish).';

  const stale = await prisma.transcription.findMany({
    where: { status: 'processing', updatedAt: { lt: staleBefore } },
  });

  let reclaimed = 0;
  for (const job of stale) {
    const giveUp = job.attempts >= MAX_TRANSCRIPTION_ATTEMPTS;

    // Conditional update guards against a race with the worker that actually
    // holds the job finishing (and moving it off `processing`) at this exact
    // moment — same pattern as claimNextTranscription's claim.
    const result = await prisma.transcription.updateMany({
      where: { id: job.id, status: 'processing' },
      data: giveUp
        ? { status: 'failed', errorMessage, audioPath: null }
        : { status: 'pending', errorMessage },
    });
    if (result.count === 0) continue;

    if (giveUp && job.audioPath) await deleteAudio(job.audioPath);
    reclaimed++;
  }

  return reclaimed;
}

/**
 * Run Whisper on a claimed transcription, then atomically persist the result
 * and log usage, and delete the stored audio (we keep only the text). On
 * failure, either requeue for another attempt (back to `pending`) or mark it
 * permanently `failed` once attempts are exhausted — deleting the audio then too.
 */
export async function processTranscription(record: Transcription): Promise<Transcription> {
  if (!record.audioPath) {
    return prisma.transcription.update({
      where: { id: record.id },
      data: { status: 'failed', errorMessage: 'Audio file is missing.' },
    });
  }

  try {
    const audioData = await readAudio(record.audioPath);
    const result = await transcribeAudio(audioData, record.fileName);

    const [updated] = await prisma.$transaction([
      prisma.transcription.update({
        where: { id: record.id },
        data: {
          status: 'done',
          text: result.text,
          durationSeconds: result.durationSeconds,
          language: result.language,
          costUsd: result.costUsd,
          segmentsJson: JSON.stringify(result.segments),
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
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const giveUp = record.attempts >= MAX_TRANSCRIPTION_ATTEMPTS;

    const updated = await prisma.transcription.update({
      where: { id: record.id },
      // Requeue for retry (`pending`) unless we've hit the attempt limit.
      data: giveUp
        ? { status: 'failed', errorMessage: message, audioPath: null }
        : { status: 'pending', errorMessage: message },
    });

    if (giveUp) await deleteAudio(record.audioPath);
    return updated;
  }
}

/** Fetch one transcription, enforcing that it belongs to the user. */
export async function getTranscription(userId: string, id: string): Promise<Transcription> {
  const record = await prisma.transcription.findUnique({ where: { id } });
  if (!record || record.userId !== userId) {
    throw new NotFoundError('Transcription not found', 'transcription/not_found');
  }
  return record;
}

/**
 * Render subtitles for an already-fetched, completed transcription. Pulled out
 * of {@link getSubtitles} so callers that already hold the record (e.g. the API
 * route, which also needs it for the filename) don't fetch it a second time.
 */
export function renderSubtitles(record: Transcription, format: 'srt' | 'vtt'): string {
  if (record.status !== 'done') {
    throw new ValidationError(
      'Subtitles are only available once transcription is done.',
      'transcription/not_done',
    );
  }

  let segments: TranscriptSegment[] = [];
  if (record.segmentsJson) {
    try {
      segments = JSON.parse(record.segmentsJson);
    } catch {
      throw new ValidationError(
        'Stored subtitle data is corrupted for this transcription.',
        'transcription/corrupted_subtitles',
      );
    }
  }

  return format === 'srt' ? toSrt(segments) : toVtt(segments);
}

/**
 * Render a completed transcription's subtitles. Throws {@link ValidationError}
 * if the job isn't done yet (ownership is enforced via {@link getTranscription}).
 */
export async function getSubtitles(
  userId: string,
  id: string,
  format: 'srt' | 'vtt',
): Promise<string> {
  const record = await getTranscription(userId, id);
  return renderSubtitles(record, format);
}

export interface TranscriptionPage {
  items: Transcription[];
  /** Id to pass as `cursor` to fetch the next page; null once there are no more. */
  nextCursor: string | null;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * List a user's transcriptions, newest first, one page at a time. Without
 * this, a user with more than one page's worth would have older
 * transcriptions permanently unreachable through the UI (they'd still exist
 * in the DB — a fixed `take` with no cursor just never asks for the rest).
 * `createdAt` alone isn't a safe cursor key (two rows can share a timestamp),
 * so ordering and paging both also key on `id`.
 */
export async function listTranscriptions(
  userId: string,
  opts: { limit?: number; cursor?: string } = {},
): Promise<TranscriptionPage> {
  const limit = opts.limit ?? DEFAULT_PAGE_SIZE;

  const rows = await prisma.transcription.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1, // one extra, to detect whether a next page exists
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}
