import { NextRequest, NextResponse } from 'next/server';
import {
  ValidationError,
  createAndProcessTranscription,
  listTranscriptions,
} from '@audio-to-text/core';
import { requireUserId } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';
import { serializeTranscription } from '@/lib/serializers';

// Whisper runs inline for now (Phase 6 moves it to the queue), so this route
// needs the Node runtime and a generous time budget.
export const runtime = 'nodejs';
export const maxDuration = 60;

/** POST /api/transcriptions — upload an audio file and transcribe it. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireUserId();

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    throw new ValidationError('Expected a "file" field with an audio upload.');
  }

  const audioData = Buffer.from(await file.arrayBuffer());
  const transcription = await createAndProcessTranscription(
    userId,
    { fileName: file.name, sizeBytes: file.size },
    audioData,
  );

  return NextResponse.json(serializeTranscription(transcription), { status: 201 });
});

/** GET /api/transcriptions — list the current user's transcriptions. */
export const GET = withErrorHandling(async () => {
  const userId = await requireUserId();
  const items = await listTranscriptions(userId);
  return NextResponse.json({ items: items.map(serializeTranscription) });
});
