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

/** Hard cap on tracked keys, independent of expiry — bounds memory even when
 * many distinct keys (e.g. a wide spread of source IPs) are all still within
 * their window and so wouldn't be swept as "expired". */
const MAX_TRACKED_KEYS = 20_000;

// A Map preserves insertion order, so the first entries are the oldest —
// exactly what we want to evict first once the hard cap is hit.
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
    sweep(now);
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

/**
 * Drop expired windows once the map gets large. If that alone isn't enough —
 * e.g. a burst of many distinct keys that are all still within their window,
 * so none look "expired" yet — fall back to evicting the oldest entries until
 * we're back under the hard cap. A little early leniency for the oldest keys
 * is a better trade-off than unbounded memory growth.
 */
function sweep(now: number): void {
  if (windows.size < 5000) return;

  for (const [key, win] of windows) {
    if (win.resetAt <= now) windows.delete(key);
  }

  if (windows.size > MAX_TRACKED_KEYS) {
    const overflow = windows.size - MAX_TRACKED_KEYS;
    const oldestKeys = Array.from(windows.keys()).slice(0, overflow);
    for (const key of oldestKeys) windows.delete(key);
  }
}
