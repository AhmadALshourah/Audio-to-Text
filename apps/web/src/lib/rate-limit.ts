import { RateLimitError } from '@audio-to-text/core';

/**
 * Minimal in-memory fixed-window rate limiter. Fits the self-contained,
 * single-process model (no Redis). Counters live in this process only and
 * reset on restart — good enough to blunt brute-force and cost-abuse; a
 * multi-instance deployment would need a shared store.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/**
 * Consume one unit for `key`. Throws {@link RateLimitError} when the limit is
 * exceeded within `windowMs`.
 */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    sweepIfLarge(now);
    return;
  }

  if (existing.count >= limit) {
    throw new RateLimitError(Math.ceil((existing.resetAt - now) / 1000));
  }

  existing.count += 1;
}

/** Best-effort client IP from proxy headers (falls back to a shared bucket). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Drop expired windows occasionally so the map can't grow without bound. */
function sweepIfLarge(now: number): void {
  if (windows.size < 5000) return;
  for (const [key, win] of windows) {
    if (win.resetAt <= now) windows.delete(key);
  }
}
