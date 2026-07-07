import { NextResponse } from 'next/server';
import { renderSubtitles, getTranscription, ValidationError } from '@audio-to-text/core';
import { requireUserId } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';

export const runtime = 'nodejs';

const CONTENT_TYPES = {
  srt: 'application/x-subrip',
  vtt: 'text/vtt',
} as const;

/** GET /api/transcriptions/:id/subtitles?format=srt|vtt — download subtitles for a completed job. */
export const GET = withErrorHandling(
  async (request: Request, { params }: { params: { id: string } }) => {
    const userId = await requireUserId();
    const format = new URL(request.url).searchParams.get('format');

    if (format !== 'srt' && format !== 'vtt') {
      throw new ValidationError('Query param "format" must be "srt" or "vtt".');
    }

    const record = await getTranscription(userId, params.id);
    const body = renderSubtitles(record, format);

    const baseName = record.fileName.replace(/\.[^/.]+$/, '');

    return new NextResponse(body, {
      headers: {
        'Content-Type': CONTENT_TYPES[format],
        'Content-Disposition': `attachment; filename="${baseName}.${format}"`,
      },
    });
  },
);
