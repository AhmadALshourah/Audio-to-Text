import { NextResponse } from 'next/server';
import { AppError } from '@audio-to-text/core';

/**
 * Convert a thrown error into a consistent JSON error response.
 * Known {@link AppError}s map to their status/code; anything else is a 500.
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status },
    );
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled API error:', err);
  return NextResponse.json(
    { error: { code: 'internal_error', message: 'Something went wrong.' } },
    { status: 500 },
  );
}

/** Wrap a route handler so any thrown error becomes a structured JSON response. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
