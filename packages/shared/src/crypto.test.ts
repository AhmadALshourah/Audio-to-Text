import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateToken, sha256 } from './crypto.js';

describe('hashPassword / verifyPassword', () => {
  it('verifies the correct password', () => {
    const stored = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('correct-horse-battery-staple', stored)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const stored = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('produces a different hash each time (random salt)', () => {
    const a = hashPassword('same-password');
    const b = hashPassword('same-password');
    expect(a).not.toBe(b);
    // ...but both still verify correctly.
    expect(verifyPassword('same-password', a)).toBe(true);
    expect(verifyPassword('same-password', b)).toBe(true);
  });

  it('rejects a malformed stored hash instead of throwing', () => {
    expect(verifyPassword('anything', 'not-a-real-hash')).toBe(false);
    expect(verifyPassword('anything', '')).toBe(false);
  });
});

describe('generateToken', () => {
  it('generates unique, URL-safe tokens', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThan(20);
  });
});

describe('sha256', () => {
  it('is deterministic', () => {
    expect(sha256('hello')).toBe(sha256('hello'));
  });

  it('differs for different input', () => {
    expect(sha256('hello')).not.toBe(sha256('world'));
  });
});
