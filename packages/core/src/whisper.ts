import OpenAI, { toFile } from 'openai';
import type { TranscriptSegment } from '@audio-to-text/shared';
import { TranscriptionError } from './errors.js';

/** OpenAI Whisper pricing: $0.006 per minute of audio. */
const WHISPER_USD_PER_MINUTE = 0.006;

let client: OpenAI | undefined;

/** Lazily create the OpenAI client so importing this module never requires the
 * key to be present (e.g. during `next build`). Reads OPENAI_API_KEY from env. */
function getClient(): OpenAI {
  client ??= new OpenAI();
  return client;
}

export interface TranscribeResult {
  text: string;
  /** Audio length in seconds, from Whisper's verbose response. */
  durationSeconds: number;
  /** Detected language code (e.g. "english"), if returned. */
  language: string | null;
  /** Estimated cost in USD, rounded to 4 decimals. */
  costUsd: number;
  /** Timed segments, used to generate SRT/VTT subtitle files. */
  segments: TranscriptSegment[];
}

/**
 * Transcribe an audio file with Whisper. This is the Node port of the original
 * Python prototype — the single place the app talks to the transcription model.
 *
 * @param data     Raw audio bytes.
 * @param fileName Original file name (Whisper uses the extension to pick a decoder).
 */
export async function transcribeAudio(
  data: Buffer | Uint8Array,
  fileName: string,
): Promise<TranscribeResult> {
  try {
    const file = await toFile(data, fileName);

    const res = await getClient().audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'verbose_json',
    });

    const durationSeconds = Math.round(res.duration ?? 0);
    const costUsd = roundUsd((durationSeconds / 60) * WHISPER_USD_PER_MINUTE);
    const segments: TranscriptSegment[] = (res.segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    return {
      text: res.text,
      durationSeconds,
      language: res.language ?? null,
      costUsd,
      segments,
    };
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      throw new TranscriptionError(`Whisper API error: ${err.message}`);
    }
    throw err;
  }
}

function roundUsd(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
