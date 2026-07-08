import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, createTranscription, listTranscriptions } from '@audio-to-text/core';
import { AUDIO_CONSTRAINTS } from '@audio-to-text/shared/types';
import { requireUserId } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';
import { serializeTranscription } from '@/lib/serializers';
import { enforceRateLimit } from '@/lib/rate-limit';

// Uploads and Prisma need the Node runtime (not the Edge runtime).
export const runtime = 'nodejs';

/**
 * POST /api/transcriptions — upload an audio file and enqueue it for
 * transcription. Returns immediately with a `pending` record; the worker
 * processes it asynchronously (see apps/worker). Poll GET /:id for status.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireUserId();

  // Cap transcription starts per user to protect Whisper cost: 20 / 5 min.
  enforceRateLimit(`transcribe:${userId}`, 20, 5 * 60 * 1000);

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new ValidationError('Expected a "file" field with an audio upload.');
  }

  // Reject oversized uploads BEFORE reading the whole file into memory, so a
  // huge upload can't exhaust server memory.
  if (file.size > AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
    const maxMb = AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES / 1024 / 1024;
    throw new ValidationError(`File too large. Maximum size is ${maxMb} MB.`);
  }

  const audioData = Buffer.from(await file.arrayBuffer());
  const transcription = await createTranscription(
    userId,
    { fileName: file.name, sizeBytes: file.size },
    audioData,
  );

  return NextResponse.json(serializeTranscription(transcription), { status: 202 });
});

/**
 * GET /api/transcriptions — list the current user's transcriptions, one page
 * at a time. Pass `?cursor=<id>` (from a previous response's `nextCursor`) to
 * fetch the next page.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireUserId();
  const cursor = request.nextUrl.searchParams.get('cursor') ?? undefined;

  const { items, nextCursor } = await listTranscriptions(userId, { cursor });
  return NextResponse.json({ items: items.map(serializeTranscription), nextCursor });
});
