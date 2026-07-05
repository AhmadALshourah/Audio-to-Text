/**
 * The session cookie name — isolated in its own module (no server-only imports)
 * so the Edge middleware can use it without pulling in Node-only code from
 * @audio-to-text/core.
 */
export const SESSION_COOKIE = 'session';
