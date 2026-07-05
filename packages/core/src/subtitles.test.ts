import { describe, it, expect } from 'vitest';
import { toSrt, toVtt } from './subtitles.js';
import type { TranscriptSegment } from '@audio-to-text/shared';

const segments: TranscriptSegment[] = [
  { start: 0, end: 2.5, text: 'Hello there.' },
  { start: 2.5, end: 5.125, text: 'This is a test.' },
];

describe('toSrt', () => {
  it('numbers cues sequentially starting at 1', () => {
    const srt = toSrt(segments);
    expect(srt).toMatch(/^1\n/);
    expect(srt).toContain('\n2\n');
  });

  it('formats timestamps as HH:MM:SS,mmm', () => {
    const srt = toSrt(segments);
    expect(srt).toContain('00:00:00,000 --> 00:00:02,500');
    expect(srt).toContain('00:00:02,500 --> 00:00:05,125');
  });

  it('includes the segment text', () => {
    const srt = toSrt(segments);
    expect(srt).toContain('Hello there.');
    expect(srt).toContain('This is a test.');
  });

  it('returns an empty string for no segments', () => {
    expect(toSrt([])).toBe('');
  });

  it('handles hour-scale offsets correctly', () => {
    const srt = toSrt([{ start: 3661, end: 3662, text: 'late' }]);
    expect(srt).toContain('01:01:01,000 --> 01:01:02,000');
  });
});

describe('toVtt', () => {
  it('starts with the WEBVTT header', () => {
    expect(toVtt(segments).startsWith('WEBVTT\n\n')).toBe(true);
  });

  it('formats timestamps with a dot instead of a comma', () => {
    const vtt = toVtt(segments);
    expect(vtt).toContain('00:00:00.000 --> 00:00:02.500');
  });

  it('includes the segment text', () => {
    expect(toVtt(segments)).toContain('This is a test.');
  });
});
