import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

/**
 * Server-only crypto helpers for self-built auth. Uses Node's built-in
 * `crypto` (scrypt) — no external dependency. Exposed via the '@audio-to-text/
 * shared/crypto' subpath only, so it never gets bundled into client code.
 */

const SCRYPT_KEYLEN = 64;

/** Hash a password with scrypt + a random per-password salt. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Verify a password against a stored `scrypt$salt$hash` string (constant-time). */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const salt = Buffer.from(parts[1]!, 'hex');
  const expected = Buffer.from(parts[2]!, 'hex');
  const derived = scryptSync(password, salt, expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

/** Generate a URL-safe random token (the raw value handed to the client). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 hex digest — used to store only a hash of session tokens. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
