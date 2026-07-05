import type { TranscriptSegment } from '@audio-to-text/shared';

/** Format seconds as SRT timestamp: HH:MM:SS,mmm */
function formatSrtTime(totalSeconds: number): string {
  const ms = Math.round(totalSeconds * 1000);
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

/** Format seconds as WebVTT timestamp: HH:MM:SS.mmm */
function formatVttTime(totalSeconds: number): string {
  return formatSrtTime(totalSeconds).replace(',', '.');
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

/** Render segments as an SRT (SubRip) subtitle file. */
export function toSrt(segments: TranscriptSegment[]): string {
  return segments
    .map((s, i) => `${i + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n`)
    .join('\n');
}

/** Render segments as a WebVTT subtitle file. */
export function toVtt(segments: TranscriptSegment[]): string {
  const body = segments
    .map((s) => `${formatVttTime(s.start)} --> ${formatVttTime(s.end)}\n${s.text}\n`)
    .join('\n');
  return `WEBVTT\n\n${body}`;
}
