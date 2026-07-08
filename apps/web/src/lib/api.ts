import { NextResponse } from 'next/server';
import { AppError, RateLimitError } from '@audio-to-text/core';
import { logger } from '@audio-to-text/shared/logger';

/**
 * Convert a thrown error into a consistent JSON error response.
 * Known {@link AppError}s map to their status/code; anything else is a 500.
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    const headers =
      err instanceof RateLimitError ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined;
    return NextResponse.json(
      { error: { code: err.code, message: err.message, params: err.params } },
      { status: err.status, headers },
    );
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled API error:', err);
  return NextResponse.json(
    { error: { code: 'internal_error', message: 'Something went wrong.' } },
    { status: 500 },
  );
}

/**
 * Wrap a route handler so any thrown error becomes a structured JSON response,
 * and every call (success or failure) logs one structured line: method, path,
 * status, and elapsed time. Next always invokes route handlers with the real
 * Request as the first argument, so this works even for handlers that ignore
 * it in their own signature (e.g. `async () => {...}`).
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    const startedAt = Date.now();
    const req = args[0] instanceof Request ? args[0] : undefined;

    let response: NextResponse;
    try {
      response = await handler(...args);
    } catch (err) {
      response = toErrorResponse(err);
    }

    logRequest(req, response.status, Date.now() - startedAt);
    return response;
  };
}

function logRequest(req: Request | undefined, status: number, elapsedMs: number): void {
  const fields = {
    method: req?.method,
    path: req ? new URL(req.url).pathname : undefined,
    status,
    elapsedMs,
  };
  if (status >= 500) logger.error('API request', fields);
  else if (status >= 400) logger.warn('API request', fields);
  else logger.info('API request', fields);
}
