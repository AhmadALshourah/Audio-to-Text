import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@audio-to-text/db';
import { registerUser, authenticateUser, getUserByToken, destroySession } from './auth-service.js';
import { ValidationError, UnauthorizedError } from './errors.js';

const testEmail = `auth-test-${Date.now()}@example.com`;

describe('auth-service', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'auth-test-' } } });
  });

  it('registers a new user with a free subscription and an open session', async () => {
    const result = await registerUser(testEmail, 'a-strong-password', 'Test User');

    expect(result.user.email).toBe(testEmail);
    expect(result.token).toBeTruthy();
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const subscription = await prisma.subscription.findUnique({
      where: { userId: result.user.id },
    });
    expect(subscription?.plan).toBe('free');
  });

  it('rejects an invalid email', async () => {
    await expect(registerUser('not-an-email', 'a-strong-password')).rejects.toThrow(
      ValidationError,
    );
  });

  it('rejects a too-short password', async () => {
    await expect(registerUser('short-pw@example.com', 'short')).rejects.toThrow(ValidationError);
  });

  it('rejects a duplicate email', async () => {
    await expect(registerUser(testEmail, 'another-password')).rejects.toThrow(ValidationError);
  });

  it('authenticates with the correct password', async () => {
    const result = await authenticateUser(testEmail, 'a-strong-password');
    expect(result.user.email).toBe(testEmail);
  });

  it('rejects the wrong password', async () => {
    await expect(authenticateUser(testEmail, 'wrong-password')).rejects.toThrow(UnauthorizedError);
  });

  it('gives the same generic error for an unknown email as for a wrong password', async () => {
    await expect(authenticateUser('nobody@example.com', 'whatever')).rejects.toThrow(
      'Invalid email or password.',
    );
    await expect(authenticateUser(testEmail, 'wrong-password')).rejects.toThrow(
      'Invalid email or password.',
    );
  });

  it('resolves a user from a valid session token, and null for garbage', async () => {
    const { token, user } = await authenticateUser(testEmail, 'a-strong-password');

    const resolved = await getUserByToken(token);
    expect(resolved?.id).toBe(user.id);

    expect(await getUserByToken('not-a-real-token')).toBeNull();
    expect(await getUserByToken(undefined)).toBeNull();
  });

  it('invalidates a session on destroySession', async () => {
    const { token } = await authenticateUser(testEmail, 'a-strong-password');
    expect(await getUserByToken(token)).not.toBeNull();

    await destroySession(token);

    expect(await getUserByToken(token)).toBeNull();
  });
});
