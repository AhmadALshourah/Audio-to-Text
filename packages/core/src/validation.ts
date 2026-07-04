import { AUDIO_CONSTRAINTS, type SupportedAudioFormat } from '@audio-to-text/shared';
import { ValidationError } from './errors.js';

export interface AudioUploadInput {
  fileName: string;
  sizeBytes: number;
}

/**
 * Validate an audio upload's metadata before we spend a Whisper API call.
 * Throws {@link ValidationError} on the first problem found.
 */
export function validateAudioUpload({ fileName, sizeBytes }: AudioUploadInput): {
  extension: SupportedAudioFormat;
} {
  if (!fileName || fileName.trim().length === 0) {
    throw new ValidationError('A file name is required.');
  }

  if (sizeBytes <= 0) {
    throw new ValidationError('The uploaded file is empty.');
  }

  if (sizeBytes > AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
    const maxMb = AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES / 1024 / 1024;
    throw new ValidationError(`File too large. Maximum size is ${maxMb} MB.`);
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!isSupportedFormat(extension)) {
    throw new ValidationError(
      `Unsupported format ".${extension}". Supported: ${AUDIO_CONSTRAINTS.SUPPORTED_FORMATS.join(', ')}.`,
    );
  }

  return { extension };
}

function isSupportedFormat(ext: string): ext is SupportedAudioFormat {
  return (AUDIO_CONSTRAINTS.SUPPORTED_FORMATS as readonly string[]).includes(ext);
}
