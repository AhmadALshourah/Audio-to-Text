/**
 * Only ever follow a `redirect` query param if it's an internal, same-origin
 * path. Guards against open-redirect payloads like `//evil.com` (protocol-
 * relative) or `https://evil.com` slipped into a login link.
 */
// Matches a URI scheme prefix, e.g. "javascript:", "https:" — only meaningful
// at the very start of the string, so a colon later on (e.g. in a query
// string) is never mistaken for one.
const SCHEME_PREFIX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

export function safeRedirectPath(value: string | null, fallback: string): string {
  if (!value) return fallback;

  // Browsers normalize backslashes to forward slashes in URLs, so
  // "/\evil.com" would otherwise slip past a startsWith('/') check and land
  // on the protocol-relative "//evil.com" bypass.
  const normalized = value.replace(/\\/g, '/');

  // Must start with exactly one '/' (not '//', which browsers treat as
  // protocol-relative) and must not smuggle in a scheme.
  if (
    !normalized.startsWith('/') ||
    normalized.startsWith('//') ||
    SCHEME_PREFIX.test(normalized)
  ) {
    return fallback;
  }
  return value;
}
