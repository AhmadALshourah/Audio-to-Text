/**
 * Typed domain errors. The API layer maps each to an HTTP status via its
 * `status` field, so route handlers never hard-code status codes.
 *
 * `code` is a stable, granular, machine-readable identifier for the specific
 * error condition (e.g. `auth/invalid_credentials`, not just `unauthorized`).
 * `packages/core` has no i18n integration of its own, so `message` is always
 * plain English; the client translates using `code` + `params` against its
 * own message catalog (see `apps/web/messages/*.json`'s `errors` namespace),
 * falling back to `message` for codes it doesn't recognize.
 */

export class AppError extends Error {
  /** HTTP status the API should respond with. */
  readonly status: number;
  /** Stable machine-readable code for clients. */
  readonly code: string;
  /** Values to interpolate into the client's translated message for `code`. */
  readonly params?: Record<string, string | number>;

  constructor(
    message: string,
    status: number,
    code: string,
    params?: Record<string, string | number>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.params = params;
  }
}

/** Invalid input (bad file type, too large, missing field). → 400 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    code = 'validation_error',
    params?: Record<string, string | number>,
  ) {
    super(message, 400, code, params);
  }
}

/** No authenticated user / auth not resolved. → 401 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'unauthorized') {
    super(message, 401, code);
  }
}

/** The authenticated user may not access / does not own the resource. → 404 */
export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'not_found') {
    super(message, 404, code);
  }
}

/** Monthly plan quota exhausted. → 402 (payment required / upgrade) */
export class QuotaExceededError extends AppError {
  constructor(
    message = 'Monthly transcription quota exceeded',
    params?: Record<string, string | number>,
  ) {
    super(message, 402, 'quota_exceeded', params);
  }
}

/** Upstream transcription provider failed. → 502 */
export class TranscriptionError extends AppError {
  constructor(message = 'Transcription failed') {
    super(message, 502, 'transcription_failed');
  }
}

/** Upstream email provider (Resend) failed to send. → 502 */
export class EmailError extends AppError {
  constructor(message = 'Failed to send email') {
    super(message, 502, 'email_failed');
  }
}

/** Too many requests in the current window. → 429 */
export class RateLimitError extends AppError {
  /** Seconds the client should wait before retrying (for a Retry-After header). */
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = 'Too many requests. Please slow down.') {
    super(message, 429, 'rate_limited');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
