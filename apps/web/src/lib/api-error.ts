import { useTranslations } from 'next-intl';

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  params?: Record<string, string | number>;
}

/**
 * Translate a structured API error (see packages/core/src/errors.ts) using
 * the `errors` message namespace. `packages/core` has no i18n integration of
 * its own, so every thrown error's `message` is plain English — `code` is the
 * stable, granular identifier the client looks up instead. Falls back to the
 * server's English `message` (or the given fallback) for codes without a
 * translation entry, e.g. `transcription_failed`, whose text comes from the
 * upstream Whisper API and can't be translated ahead of time.
 */
export function useApiErrorMessage(): (
  error: ApiErrorPayload | null | undefined,
  fallback: string,
) => string {
  const t = useTranslations('errors');

  return (error, fallback) => {
    if (!error?.code || !t.has(error.code)) return error?.message || fallback;
    return t(error.code, error.params);
  };
}
