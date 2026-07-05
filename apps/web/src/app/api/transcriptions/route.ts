import { NextRequest, NextResponse } from 'next/server';
import { ValidationError, createTranscription, listTranscriptions } from '@audio-to-text/core';
import { requireUserId } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';
import { serializeTranscription } from '@/lib/serializers';

// Uploads and Prisma need the Node runtime (not the Edge runtime).
export const runtime = 'nodejs';

/**
 * POST /api/transcriptions — upload an audio file and enqueue it for
 * transcription. Returns immediately with a `pending` record; the worker
 * processes it asynchronously (see apps/worker). Poll GET /:id for status.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireUserId();

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new ValidationError('Expected a "file" field with an audio upload.');
  }

  const audioData = Buffer.from(await file.arrayBuffer());
  const transcription = await createTranscription(
    userId,
    { fileName: file.name, sizeBytes: file.size },
    audioData,
  );

  return NextResponse.json(serializeTranscription(transcription), { status: 202 });
});

/** GET /api/transcriptions — list the current user's transcriptions. */
export const GET = withErrorHandling(async () => {
  const userId = await requireUserId();
  const items = await listTranscriptions(userId);
  return NextResponse.json({ items: items.map(serializeTranscription) });
});
