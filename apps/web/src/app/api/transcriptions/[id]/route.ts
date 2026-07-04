import { NextResponse } from 'next/server';
import { getTranscription } from '@audio-to-text/core';
import { requireUserId } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';
import { serializeTranscription } from '@/lib/serializers';

export const runtime = 'nodejs';

/** GET /api/transcriptions/:id — fetch one transcription owned by the user. */
export const GET = withErrorHandling(
  async (_request: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    const transcription = await getTranscription(userId, params.id);
    return NextResponse.json(serializeTranscription(transcription));
  },
);
