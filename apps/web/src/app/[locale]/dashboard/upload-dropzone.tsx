'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AUDIO_CONSTRAINTS,
  checkAudioUpload,
  type SupportedAudioFormat,
} from '@audio-to-text/shared/types';
import { formatBytes } from '@/lib/format';

interface UploadDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  disabled: boolean;
}

/**
 * Client-side pre-check for instant feedback. Delegates the actual rule
 * (format/size) to {@link checkAudioUpload} — the same predicate
 * packages/core/src/validation.ts uses server-side — so the two can never
 * silently drift; only the messaging differs per side.
 */
function validateClientSide(
  file: File,
  t: (key: string, values?: Record<string, string | number>) => string,
): string | null {
  const result = checkAudioUpload(file.name, file.size);
  if (result.ok) return null;

  switch (result.issue.code) {
    case 'empty_name':
    case 'empty_file':
      return t('uploadFailed');
    case 'too_large':
      return t('fileTooLarge', {
        size: formatBytes(file.size),
        max: formatBytes(result.issue.maxBytes),
      });
    case 'unsupported_format':
      return t('unsupportedFormat', {
        ext: result.issue.extension,
        formats: result.issue.supported.join(', '),
      });
  }
}

export function UploadDropzone({ onUpload, disabled }: UploadDropzoneProps) {
  const t = useTranslations('dashboard');
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const validationError = validateClientSide(file, t);
      if (validationError) {
        setLocalError(validationError);
        return;
      }
      setLocalError(null);
      await onUpload(file);
    },
    [onUpload, t],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled) void processFile(e.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
          disabled
            ? 'cursor-not-allowed border-ink/10 bg-paper-soft text-ink/30'
            : dragActive
              ? 'border-accent bg-paper-soft'
              : 'border-ink/20 hover:border-ink/40'
        }`}
      >
        <p className="font-medium">{disabled ? t('dropzoneBusy') : t('dropzoneIdle')}</p>
        <p className="text-sm text-ink/70">
          {AUDIO_CONSTRAINTS.SUPPORTED_FORMATS.join(', ')} · {t('dropzoneMax')}{' '}
          {formatBytes(AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES)}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={AUDIO_CONSTRAINTS.SUPPORTED_FORMATS.map(
            (f: SupportedAudioFormat) => `.${f}`,
          ).join(',')}
          className="hidden"
          disabled={disabled}
          onChange={(e) => void processFile(e.target.files?.[0])}
        />
      </div>
      {localError && <p className="mt-2 text-sm text-red-600">{localError}</p>}
    </div>
  );
}
