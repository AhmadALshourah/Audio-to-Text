import { checkAudioUpload, type SupportedAudioFormat } from '@audio-to-text/shared';
import { ValidationError } from './errors.js';

export interface AudioUploadInput {
  fileName: string;
  sizeBytes: number;
}

/**
 * Validate an audio upload's metadata before we spend a Whisper API call.
 * Delegates the actual rule-checking to {@link checkAudioUpload} (shared with
 * the client-side dropzone, so the two can't drift) and throws
 * {@link ValidationError} on the first problem found.
 */
export function validateAudioUpload({ fileName, sizeBytes }: AudioUploadInput): {
  extension: SupportedAudioFormat;
} {
  const result = checkAudioUpload(fileName, sizeBytes);
  if (result.ok) return { extension: result.extension };

  switch (result.issue.code) {
    case 'empty_name':
      throw new ValidationError('A file name is required.');
    case 'empty_file':
      throw new ValidationError('The uploaded file is empty.');
    case 'too_large':
      throw new ValidationError(
        `File too large. Maximum size is ${result.issue.maxBytes / 1024 / 1024} MB.`,
      );
    case 'unsupported_format':
      throw new ValidationError(
        `Unsupported format ".${result.issue.extension}". Supported: ${result.issue.supported.join(', ')}.`,
      );
  }
}

function ascii(buf: Buffer, start: number, text: string): boolean {
  return buf.toString('latin1', start, start + text.length) === text;
}

/**
 * Sniff the file's leading bytes to confirm it really is an audio/media
 * container we support — not, say, a script renamed to `.mp3`. Defense in
 * depth: rejects garbage before we spend a Whisper call or store it on disk.
 */
export function looksLikeAudio(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // WAV: "RIFF"...."WAVE"
  if (ascii(buffer, 0, 'RIFF') && ascii(buffer, 8, 'WAVE')) return true;
  // OGG
  if (ascii(buffer, 0, 'OggS')) return true;
  // FLAC
  if (ascii(buffer, 0, 'fLaC')) return true;
  // MP4 / M4A: "ftyp" box at offset 4
  if (ascii(buffer, 4, 'ftyp')) return true;
  // Matroska / WebM: EBML header 1A 45 DF A3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return true;
  }
  // MP3 / MPEG audio: ID3 tag, or an MPEG frame sync (0xFF Ex/Fx)
  if (ascii(buffer, 0, 'ID3')) return true;
  if (buffer[0] === 0xff && (buffer[1]! & 0xe0) === 0xe0) return true;

  return false;
}

/** Throw {@link ValidationError} if the bytes don't look like supported audio. */
export function assertAudioContent(buffer: Buffer): void {
  if (!looksLikeAudio(buffer)) {
    throw new ValidationError('This file does not appear to be a supported audio file.');
  }
}
