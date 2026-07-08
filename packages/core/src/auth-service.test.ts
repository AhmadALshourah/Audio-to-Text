import { describe, it, expect, afterAll, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { prisma } from '@audio-to-text/db';

// Mock the Resend call so tests never try to send real email (no network,
// no API key needed) while still exercising the token lifecycle around it.
vi.mock('./email.js', () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

import { sendPasswordResetEmail, sendVerificationEmail } from './email.js';
import {
  registerUser,
  authenticateUser,
  getUserByToken,
  destroySession,
  deleteAccount,
  requestPasswordReset,
  resetPassword,
  changePassword,
  changeEmail,
  verifyEmail,
  cleanupExpiredAuthRecords,
} from './auth-service.js';
import { ValidationError, UnauthorizedError } from './errors.js';
import { saveAudio } from './storage.js';

const mockSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail);
const mockSendVerificationEmail = vi.mocked(sendVerificationEmail);

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

  it('rejects an over-long password before it ever reaches scrypt', async () => {
    await expect(
      registerUser('long-pw@example.com', 'a'.repeat(129)),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an over-long email', async () => {
    const hugeLocalPart = 'a'.repeat(250);
    await expect(
      registerUser(`${hugeLocalPart}@example.com`, 'a-strong-password'),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an over-long password on login without throwing from scrypt itself', async () => {
    await expect(authenticateUser(testEmail, 'a'.repeat(129))).rejects.toThrow(ValidationError);
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

  it('deleteAccount removes the user, their sessions, and any in-flight audio', async () => {
    const { user, token } = await registerUser(
      `delete-me-${Date.now()}@example.com`,
      'a-strong-password',
    );

    const transcription = await prisma.transcription.create({
      data: { userId: user.id, status: 'pending', fileName: 'a.wav', fileSizeBytes: 44 },
    });
    const audioPath = await saveAudio(transcription.id, 'wav', Buffer.alloc(44));
    await prisma.transcription.update({ where: { id: transcription.id }, data: { audioPath } });

    expect(existsSync(audioPath)).toBe(true);

    await deleteAccount(user.id);

    expect(existsSync(audioPath)).toBe(false);
    expect(await getUserByToken(token)).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });

  describe('password reset', () => {
    it('emails a reset link for a registered email and lets it be redeemed', async () => {
      mockSendPasswordResetEmail.mockClear();

      await requestPasswordReset(testEmail, (token) => `https://example.com/reset?token=${token}`);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const [to, resetUrl] = mockSendPasswordResetEmail.mock.calls[0]!;
      expect(to).toBe(testEmail);
      const token = new URL(resetUrl).searchParams.get('token')!;
      expect(token).toBeTruthy();

      const result = await resetPassword(token, 'a-new-strong-password');
      expect(result.user.email).toBe(testEmail);

      // The new password works; the old one no longer does.
      await expect(authenticateUser(testEmail, 'a-new-strong-password')).resolves.toBeTruthy();
      await expect(authenticateUser(testEmail, 'a-strong-password')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('invalidates every existing session when a password is reset', async () => {
      const { token: oldSessionToken } = await authenticateUser(
        testEmail,
        'a-new-strong-password',
      );
      expect(await getUserByToken(oldSessionToken)).not.toBeNull();

      mockSendPasswordResetEmail.mockClear();
      await requestPasswordReset(testEmail, (token) => `https://example.com/reset?token=${token}`);
      const [, resetUrl] = mockSendPasswordResetEmail.mock.calls[0]!;
      const resetToken = new URL(resetUrl).searchParams.get('token')!;

      await resetPassword(resetToken, 'yet-another-password');

      expect(await getUserByToken(oldSessionToken)).toBeNull();
    });

    it('does not error and does not send email for an unregistered address', async () => {
      mockSendPasswordResetEmail.mockClear();
      await expect(
        requestPasswordReset('nobody-registered@example.com', (t) => t),
      ).resolves.toBeUndefined();
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('rejects an unknown or already-used token', async () => {
      await expect(resetPassword('not-a-real-token', 'a-strong-password')).rejects.toThrow(
        ValidationError,
      );
    });

    it('does not throw when the email provider fails to send (logged, not surfaced)', async () => {
      mockSendPasswordResetEmail.mockClear();
      mockSendPasswordResetEmail.mockRejectedValueOnce(new Error('Resend is down'));

      let capturedToken = '';
      await expect(
        requestPasswordReset(testEmail, (token) => {
          capturedToken = token;
          return `https://example.com/reset?token=${token}`;
        }),
      ).resolves.toBeUndefined();

      // The token was still generated and persisted even though the send failed.
      await expect(
        resetPassword(capturedToken, 'a-strong-password-after-outage'),
      ).resolves.toBeTruthy();
    });

    it('rejects a too-short new password', async () => {
      mockSendPasswordResetEmail.mockClear();
      await requestPasswordReset(testEmail, (token) => `https://example.com/reset?token=${token}`);
      const [, resetUrl] = mockSendPasswordResetEmail.mock.calls[0]!;
      const token = new URL(resetUrl).searchParams.get('token')!;

      await expect(resetPassword(token, 'short')).rejects.toThrow(ValidationError);
    });

    it('only the newest reset link works once a new one has been requested', async () => {
      mockSendPasswordResetEmail.mockClear();
      await requestPasswordReset(testEmail, (token) => `https://example.com/reset?token=${token}`);
      const [, firstUrl] = mockSendPasswordResetEmail.mock.calls[0]!;
      const firstToken = new URL(firstUrl).searchParams.get('token')!;

      mockSendPasswordResetEmail.mockClear();
      await requestPasswordReset(testEmail, (token) => `https://example.com/reset?token=${token}`);
      const [, secondUrl] = mockSendPasswordResetEmail.mock.calls[0]!;
      const secondToken = new URL(secondUrl).searchParams.get('token')!;

      await expect(resetPassword(firstToken, 'a-strong-password-2')).rejects.toThrow(
        ValidationError,
      );
      await expect(resetPassword(secondToken, 'a-strong-password-2')).resolves.toBeTruthy();
    });
  });

  describe('account settings', () => {
    it('changes the password when the current password is correct, and rotates the session', async () => {
      const { user, token: oldToken } = await registerUser(
        `auth-test-settings-pw-${Date.now()}@example.com`,
        'original-password-1',
      );

      const result = await changePassword(user.id, 'original-password-1', 'brand-new-password-1');
      expect(result.user.id).toBe(user.id);

      // Old session is gone; new password works, old one doesn't.
      expect(await getUserByToken(oldToken)).toBeNull();
      await expect(authenticateUser(user.email, 'brand-new-password-1')).resolves.toBeTruthy();
      await expect(authenticateUser(user.email, 'original-password-1')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('rejects a password change with the wrong current password', async () => {
      const { user } = await registerUser(
        `auth-test-settings-pw2-${Date.now()}@example.com`,
        'original-password-2',
      );
      await expect(
        changePassword(user.id, 'wrong-current-password', 'new-password-2'),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('rejects a password change to a too-short new password', async () => {
      const { user } = await registerUser(
        `auth-test-settings-pw3-${Date.now()}@example.com`,
        'original-password-3',
      );
      await expect(changePassword(user.id, 'original-password-3', 'short')).rejects.toThrow(
        ValidationError,
      );
    });

    it('rejects a password change with an over-long current or new password', async () => {
      const { user } = await registerUser(
        `auth-test-settings-pw-long-${Date.now()}@example.com`,
        'original-password-long',
      );
      await expect(
        changePassword(user.id, 'a'.repeat(129), 'new-password-long'),
      ).rejects.toThrow(ValidationError);
      await expect(
        changePassword(user.id, 'original-password-long', 'a'.repeat(129)),
      ).rejects.toThrow(ValidationError);
    });

    it('changes the email when the current password is correct, and keeps existing sessions valid', async () => {
      const { user, token } = await registerUser(
        `auth-test-settings-email-${Date.now()}@example.com`,
        'a-strong-password-4',
      );
      const newEmail = `auth-test-settings-email-new-${Date.now()}@example.com`;

      const updated = await changeEmail(user.id, newEmail, 'a-strong-password-4');
      expect(updated.email).toBe(newEmail);

      // Session survives an email change (unlike a password change).
      expect(await getUserByToken(token)).not.toBeNull();
      await expect(authenticateUser(newEmail, 'a-strong-password-4')).resolves.toBeTruthy();
    });

    it('rejects an email change with the wrong current password', async () => {
      const { user } = await registerUser(
        `auth-test-settings-email2-${Date.now()}@example.com`,
        'a-strong-password-5',
      );
      await expect(
        changeEmail(user.id, 'someone-else@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('rejects an email change to an email already in use', async () => {
      const { user: userA } = await registerUser(
        `auth-test-settings-email3a-${Date.now()}@example.com`,
        'a-strong-password-6',
      );
      const { user: userB } = await registerUser(
        `auth-test-settings-email3b-${Date.now()}@example.com`,
        'a-strong-password-7',
      );
      await expect(changeEmail(userB.id, userA.email, 'a-strong-password-7')).rejects.toThrow(
        ValidationError,
      );
    });

    it('rejects an email change to the same email (no-op)', async () => {
      const { user } = await registerUser(
        `auth-test-settings-email4-${Date.now()}@example.com`,
        'a-strong-password-8',
      );
      await expect(changeEmail(user.id, user.email, 'a-strong-password-8')).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('email verification', () => {
    it('does not send a verification email when buildVerifyUrl is omitted', async () => {
      mockSendVerificationEmail.mockClear();
      await registerUser(`auth-test-verify-skip-${Date.now()}@example.com`, 'a-strong-password-9');
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });

    it('sends and lets a signup verification link be redeemed', async () => {
      mockSendVerificationEmail.mockClear();
      const email = `auth-test-verify-${Date.now()}@example.com`;

      const { user } = await registerUser(
        email,
        'a-strong-password-10',
        undefined,
        (token) => `https://example.com/verify-email?token=${token}`,
      );

      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
      const [to, verifyUrl] = mockSendVerificationEmail.mock.calls[0]!;
      expect(to).toBe(email);

      let unverified = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(unverified.emailVerifiedAt).toBeNull();

      const token = new URL(verifyUrl).searchParams.get('token')!;
      await verifyEmail(token);

      const verified = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(verified.emailVerifiedAt).not.toBeNull();
    });

    it('rejects an unknown or already-used verification token', async () => {
      await expect(verifyEmail('not-a-real-token')).rejects.toThrow(ValidationError);
    });

    it('does not throw when the email provider fails to send a verification email', async () => {
      mockSendVerificationEmail.mockClear();
      mockSendVerificationEmail.mockRejectedValueOnce(new Error('Resend is down'));

      await expect(
        registerUser(
          `auth-test-verify-fail-${Date.now()}@example.com`,
          'a-strong-password-11',
          undefined,
          (token) => `https://example.com/verify-email?token=${token}`,
        ),
      ).resolves.toBeTruthy();
    });

    it('resets verification status and sends a fresh link when the email changes', async () => {
      const { user } = await registerUser(
        `auth-test-verify-change-${Date.now()}@example.com`,
        'a-strong-password-12',
        undefined,
        (token) => `https://example.com/verify-email?token=${token}`,
      );
      const [, firstVerifyUrl] = mockSendVerificationEmail.mock.calls.at(-1)!;
      await verifyEmail(new URL(firstVerifyUrl).searchParams.get('token')!);

      let verified = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(verified.emailVerifiedAt).not.toBeNull();

      mockSendVerificationEmail.mockClear();
      const newEmail = `auth-test-verify-changed-${Date.now()}@example.com`;
      await changeEmail(
        user.id,
        newEmail,
        'a-strong-password-12',
        (token) => `https://example.com/verify-email?token=${token}`,
      );

      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
      const [to] = mockSendVerificationEmail.mock.calls[0]!;
      expect(to).toBe(newEmail);

      verified = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(verified.emailVerifiedAt).toBeNull();
    });
  });

  describe('cleanupExpiredAuthRecords', () => {
    it('deletes expired sessions and tokens but leaves unexpired ones alone', async () => {
      const { user } = await registerUser(
        `auth-test-cleanup-${Date.now()}@example.com`,
        'a-strong-password-13',
      );

      const past = new Date(Date.now() - 60_000);
      const future = new Date(Date.now() + 60_000);

      const [expiredSession, liveSession] = await Promise.all([
        prisma.session.create({
          data: { userId: user.id, tokenHash: `expired-session-${Date.now()}`, expiresAt: past },
        }),
        prisma.session.create({
          data: { userId: user.id, tokenHash: `live-session-${Date.now()}`, expiresAt: future },
        }),
      ]);
      const [expiredReset, expiredVerify] = await Promise.all([
        prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: `expired-reset-${Date.now()}`, expiresAt: past },
        }),
        prisma.emailVerificationToken.create({
          data: { userId: user.id, tokenHash: `expired-verify-${Date.now()}`, expiresAt: past },
        }),
      ]);

      const deleted = await cleanupExpiredAuthRecords();
      expect(deleted).toBeGreaterThanOrEqual(3);

      expect(await prisma.session.findUnique({ where: { id: expiredSession.id } })).toBeNull();
      expect(await prisma.session.findUnique({ where: { id: liveSession.id } })).not.toBeNull();
      expect(
        await prisma.passwordResetToken.findUnique({ where: { id: expiredReset.id } }),
      ).toBeNull();
      expect(
        await prisma.emailVerificationToken.findUnique({ where: { id: expiredVerify.id } }),
      ).toBeNull();
    });
  });
});
