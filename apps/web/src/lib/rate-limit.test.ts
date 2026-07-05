import { describe, it, expect, vi, afterEach } from 'vitest';
import { RateLimitError } from '@audio-to-text/core';
import { enforceRateLimit, clientIp } from './rate-limit.js';

// The limiter's state is a module-level singleton, so each test uses its own
// unique key to stay independent without needing to reset internal state.
let keyCounter = 0;
function uniqueKey(): string {
  keyCounter += 1;
  return `test-key-${keyCounter}`;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('enforceRateLimit', () => {
  it('allows requests up to the limit', () => {
    const key = uniqueKey();
    expect(() => {
      enforceRateLimit(key, 3, 60_000);
      enforceRateLimit(key, 3, 60_000);
      enforceRateLimit(key, 3, 60_000);
    }).not.toThrow();
  });

  it('throws RateLimitError once the limit is exceeded', () => {
    const key = uniqueKey();
    enforceRateLimit(key, 2, 60_000);
    enforceRateLimit(key, 2, 60_000);
    expect(() => enforceRateLimit(key, 2, 60_000)).toThrow(RateLimitError);
  });

  it('reports a sensible retryAfterSeconds', () => {
    const key = uniqueKey();
    enforceRateLimit(key, 1, 60_000);
    try {
      enforceRateLimit(key, 1, 60_000);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterSeconds).toBeGreaterThan(0);
      expect((err as RateLimitError).retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it('resets the count once the window has elapsed', () => {
    vi.useFakeTimers();
    const key = uniqueKey();

    enforceRateLimit(key, 1, 1000);
    expect(() => enforceRateLimit(key, 1, 1000)).toThrow(RateLimitError);

    vi.advanceTimersByTime(1001);

    expect(() => enforceRateLimit(key, 1, 1000)).not.toThrow();
  });

  it('tracks independent windows per key', () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();

    enforceRateLimit(keyA, 1, 60_000);
    expect(() => enforceRateLimit(keyA, 1, 60_000)).toThrow(RateLimitError);
    // A different key must not be affected by keyA's exhausted window.
    expect(() => enforceRateLimit(keyB, 1, 60_000)).not.toThrow();
  });
});

describe('clientIp', () => {
  function requestWithHeaders(headers: Record<string, string>): Request {
    return new Request('http://localhost/', { headers });
  }

  it('reads the first address from x-forwarded-for', () => {
    const req = requestWithHeaders({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' });
    expect(clientIp(req)).toBe('203.0.113.1');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = requestWithHeaders({ 'x-real-ip': '198.51.100.7' });
    expect(clientIp(req)).toBe('198.51.100.7');
  });

  it('falls back to "unknown" when neither header is present', () => {
    const req = requestWithHeaders({});
    expect(clientIp(req)).toBe('unknown');
  });
});
