import type { Transcription } from '@audio-to-text/db';

/** Client-facing shape of a transcription (no internal fields like userId). */
export interface TranscriptionDTO {
  id: string;
  status: Transcription['status'];
  fileName: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  language: string | null;
  text: string | null;
  errorMessage: string | null;
  costUsd: number | null;
  createdAt: string;
  completedAt: string | null;
}

export function serializeTranscription(t: Transcription): TranscriptionDTO {
  return {
    id: t.id,
    status: t.status,
    fileName: t.fileName,
    fileSizeBytes: t.fileSizeBytes,
    durationSeconds: t.durationSeconds,
    language: t.language,
    text: t.text,
    errorMessage: t.errorMessage,
    costUsd: t.costUsd === null ? null : Number(t.costUsd),
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
  };
}
