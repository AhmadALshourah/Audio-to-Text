import { describe, it, expect } from 'vitest';
import { validateAudioUpload, looksLikeAudio, assertAudioContent } from './validation.js';
import { ValidationError } from './errors.js';
import { AUDIO_CONSTRAINTS } from '@audio-to-text/shared';

describe('validateAudioUpload', () => {
  it('accepts a valid mp3 upload', () => {
    const { extension } = validateAudioUpload({ fileName: 'meeting.mp3', sizeBytes: 1024 });
    expect(extension).toBe('mp3');
  });

  it('rejects an empty file name', () => {
    expect(() => validateAudioUpload({ fileName: '', sizeBytes: 1024 })).toThrow(ValidationError);
  });

  it('rejects a zero-byte file', () => {
    expect(() => validateAudioUpload({ fileName: 'a.mp3', sizeBytes: 0 })).toThrow(ValidationError);
  });

  it('rejects a file over the size limit', () => {
    expect(() =>
      validateAudioUpload({
        fileName: 'huge.mp3',
        sizeBytes: AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES + 1,
      }),
    ).toThrow(ValidationError);
  });

  it('accepts a file exactly at the size limit', () => {
    expect(() =>
      validateAudioUpload({ fileName: 'ok.mp3', sizeBytes: AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES }),
    ).not.toThrow();
  });

  it('rejects an unsupported format', () => {
    expect(() => validateAudioUpload({ fileName: 'script.exe', sizeBytes: 1024 })).toThrow(
      ValidationError,
    );
  });

  it('is case-insensitive on the extension', () => {
    const { extension } = validateAudioUpload({ fileName: 'VOICE.WAV', sizeBytes: 1024 });
    expect(extension).toBe('wav');
  });
});

describe('looksLikeAudio', () => {
  it('recognizes a WAV header', () => {
    const buf = Buffer.alloc(44);
    buf.write('RIFF', 0);
    buf.write('WAVE', 8);
    expect(looksLikeAudio(buf)).toBe(true);
  });

  it('recognizes an OGG header', () => {
    const buf = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(20)]);
    expect(looksLikeAudio(buf)).toBe(true);
  });

  it('recognizes an MP3 ID3 tag', () => {
    const buf = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(20)]);
    expect(looksLikeAudio(buf)).toBe(true);
  });

  it('recognizes an MP3 frame sync', () => {
    const buf = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(looksLikeAudio(buf)).toBe(true);
  });

  it('rejects plain text pretending to be audio', () => {
    const buf = Buffer.from('this is not audio at all, just plain text');
    expect(looksLikeAudio(buf)).toBe(false);
  });

  it('rejects a too-short buffer', () => {
    expect(looksLikeAudio(Buffer.from('RIFF'))).toBe(false);
  });
});

describe('assertAudioContent', () => {
  it('throws ValidationError for non-audio bytes', () => {
    expect(() => assertAudioContent(Buffer.from('not audio'))).toThrow(ValidationError);
  });

  it('does not throw for valid audio bytes', () => {
    const buf = Buffer.alloc(44);
    buf.write('RIFF', 0);
    buf.write('WAVE', 8);
    expect(() => assertAudioContent(buf)).not.toThrow();
  });
});
