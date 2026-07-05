/**
 * Typed domain errors. The API layer maps each to an HTTP status via its
 * `status` field, so route handlers never hard-code status codes.
 */

export class AppError extends Error {
  /** HTTP status the API should respond with. */
  readonly status: number;
  /** Stable machine-readable code for clients. */
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

/** Invalid input (bad file type, too large, missing field). → 400 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'validation_error');
  }
}

/** No authenticated user / auth not resolved. → 401 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'unauthorized');
  }
}

/** The authenticated user may not access / does not own the resource. → 404 */
export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'not_found');
  }
}

/** Monthly plan quota exhausted. → 402 (payment required / upgrade) */
export class QuotaExceededError extends AppError {
  constructor(message = 'Monthly transcription quota exceeded') {
    super(message, 402, 'quota_exceeded');
  }
}

/** Upstream transcription provider failed. → 502 */
export class TranscriptionError extends AppError {
  constructor(message = 'Transcription failed') {
    super(message, 502, 'transcription_failed');
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
