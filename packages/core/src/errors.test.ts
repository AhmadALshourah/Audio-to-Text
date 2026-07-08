import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  QuotaExceededError,
  TranscriptionError,
  RateLimitError,
  AppError,
} from './errors.js';

describe('typed domain errors', () => {
  it('ValidationError maps to 400', () => {
    const err = new ValidationError('bad input');
    expect(err.status).toBe(400);
    expect(err.code).toBe('validation_error');
    expect(err).toBeInstanceOf(AppError);
  });

  it('UnauthorizedError maps to 401', () => {
    expect(new UnauthorizedError().status).toBe(401);
    expect(new UnauthorizedError().code).toBe('unauthorized');
  });

  it('NotFoundError maps to 404', () => {
    expect(new NotFoundError().status).toBe(404);
    expect(new NotFoundError().code).toBe('not_found');
  });

  it('QuotaExceededError maps to 402', () => {
    expect(new QuotaExceededError().status).toBe(402);
    expect(new QuotaExceededError().code).toBe('quota_exceeded');
  });

  it('TranscriptionError maps to 502', () => {
    expect(new TranscriptionError().status).toBe(502);
    expect(new TranscriptionError().code).toBe('transcription_failed');
  });

  it('RateLimitError maps to 429 and carries retryAfterSeconds', () => {
    const err = new RateLimitError(42);
    expect(err.status).toBe(429);
    expect(err.code).toBe('rate_limited');
    expect(err.retryAfterSeconds).toBe(42);
  });

  it('each error carries a custom message when given one', () => {
    expect(new NotFoundError('specific message').message).toBe('specific message');
  });

  it('accepts a granular per-instance code, for client-side i18n lookup', () => {
    const err = new ValidationError('Please enter a valid email address.', 'auth/invalid_email');
    expect(err.code).toBe('auth/invalid_email');
    expect(err.status).toBe(400);
  });

  it('carries optional params for message interpolation', () => {
    const err = new QuotaExceededError('You have used 30 minutes.', { limitMinutes: 30 });
    expect(err.params).toEqual({ limitMinutes: 30 });
  });

  it('leaves params undefined when none are given', () => {
    expect(new ValidationError('bad input').params).toBeUndefined();
  });
});
