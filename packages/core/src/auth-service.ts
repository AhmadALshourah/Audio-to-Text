import { prisma, type User } from '@audio-to-text/db';
import { hashPassword, verifyPassword, generateToken, sha256 } from '@audio-to-text/shared/crypto';
import { logger } from '@audio-to-text/shared/logger';
import { ValidationError, UnauthorizedError } from './errors.js';
import { deleteAudio } from './storage.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.js';

/** How long a session stays valid. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** How long a password-reset link stays usable. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** How long an email-verification link stays usable. */
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Precomputed hash of a random value, verified against when a login email is
 * unknown so the work done is identical to a real (failed) password check. */
const DUMMY_PASSWORD_HASH = hashPassword(generateToken());

export interface AuthResult {
  user: User;
  /** Raw session token to set in the client cookie (only returned here, never stored). */
  token: string;
  expiresAt: Date;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// `scrypt` is deliberately slow/CPU-heavy; an unbounded password length turns
// that into a cheap CPU-exhaustion vector (a multi-MB string hashed on every
// register/login attempt). Cap well above any real password anyone would
// type or a password manager would generate.
const MAX_PASSWORD_LENGTH = 128;
// RFC 5321's own limit on the mailbox part of an address.
const MAX_EMAIL_LENGTH = 254;

/** Throws if `password` is outside the length bounds we accept. */
function assertPasswordLength(password: string): void {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters.', 'auth/weak_password');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
      'auth/password_too_long',
    );
  }
}

/** Throws if `email` is too long or doesn't look like an email address. */
function assertEmailFormat(email: string): void {
  if (email.length > MAX_EMAIL_LENGTH) {
    throw new ValidationError(
      `Email must be at most ${MAX_EMAIL_LENGTH} characters.`,
      'auth/email_too_long',
    );
  }
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError('Please enter a valid email address.', 'auth/invalid_email');
  }
}

/**
 * Register a new user (email + password), provision a free subscription, and
 * open a session. Throws {@link ValidationError} on bad input or duplicate
 * email. If `buildVerifyUrl` is given, also issues an email-verification link
 * (best-effort — a delivery failure is logged, not thrown; a typo'd email
 * just never gets verified, it doesn't block signup). Omit it (e.g. in
 * tests not concerned with email) to skip verification entirely.
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string,
  buildVerifyUrl?: (token: string) => string,
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  assertEmailFormat(normalizedEmail);
  assertPasswordLength(password);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new ValidationError('An account with this email already exists.', 'auth/email_taken');
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name?.trim() || null,
      passwordHash: hashPassword(password),
      subscription: {
        create: {
          plan: 'free',
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      },
    },
  });

  if (buildVerifyUrl) await issueVerificationEmail(user.id, user.email, buildVerifyUrl);

  const session = await openSession(user.id);
  return { user, ...session };
}

/**
 * Verify credentials and open a session. Uses the same generic error for
 * "no such user" and "wrong password" so we don't leak which emails exist.
 */
export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  // Reject oversized input before it ever reaches scrypt — a fixed system
  // limit unrelated to any specific account, so fast-rejecting here doesn't
  // create an enumeration side-channel the way skipping the dummy-hash
  // check below would.
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
      'auth/password_too_long',
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Always run a scrypt verification — even when the user doesn't exist we
  // verify against a dummy hash — so response timing doesn't reveal whether an
  // email is registered (mitigates user enumeration).
  const ok = verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !ok) {
    throw new UnauthorizedError('Invalid email or password.', 'auth/invalid_credentials');
  }

  const session = await openSession(user.id);
  return { user, ...session };
}

/**
 * Resolve the user for a raw session token (from the cookie). Returns null if
 * the token is unknown or expired; expired sessions are cleaned up on read.
 */
export async function getUserByToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

/** Invalidate a session (logout). */
export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

/**
 * Proactively delete expired sessions and expired/orphaned password-reset and
 * email-verification tokens. Without this, a session or token nobody ever
 * presents again (an abandoned browser, an unclicked email link) lives in its
 * table forever — {@link getUserByToken} only cleans up a session lazily, on
 * the read that discovers it's expired. Returns the total rows deleted.
 */
export async function cleanupExpiredAuthRecords(): Promise<number> {
  const now = new Date();
  const [sessions, resetTokens, verificationTokens] = await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return sessions.count + resetTokens.count + verificationTokens.count;
}

/**
 * Request a password-reset email. Always resolves without revealing whether
 * the address is registered or whether the email actually went out (both
 * would let an attacker enumerate accounts) — if an account exists, a
 * one-time link is generated and emailed via `buildResetUrl`; a delivery
 * failure (bad Resend key, provider outage) is logged, not thrown. Any
 * previous unused tokens for the user are cleared first, so only the newest
 * link works.
 */
export async function requestPasswordReset(
  email: string,
  buildResetUrl: (token: string) => string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  try {
    await sendPasswordResetEmail(user.email, buildResetUrl(token));
  } catch (err) {
    logger.error('Failed to send password-reset email', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Consume a password-reset token: set the new password, delete the token
 * (single-use), invalidate every existing session (a reset is exactly the
 * moment you want every other logged-in device signed out), and open a fresh
 * one for the device completing the reset.
 */
export async function resetPassword(token: string, newPassword: string): Promise<AuthResult> {
  assertPasswordLength(newPassword);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new ValidationError(
      'This password reset link is invalid or has expired.',
      'auth/invalid_reset_token',
    );
  }

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  const session = await openSession(user.id);
  return { user, ...session };
}

/**
 * Issue a fresh email-verification token for `userId`/`email` and send it via
 * `buildVerifyUrl`. Any previous unused token for the user is cleared first,
 * so only the newest link works. A delivery failure is logged, not thrown —
 * shared by {@link registerUser} and {@link changeEmail}.
 */
async function issueVerificationEmail(
  userId: string,
  email: string,
  buildVerifyUrl: (token: string) => string,
): Promise<void> {
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });

  const token = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });

  try {
    await sendVerificationEmail(email, buildVerifyUrl(token));
  } catch (err) {
    logger.error('Failed to send verification email', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Consume an email-verification token: mark the address verified and delete
 * the token (single-use).
 */
export async function verifyEmail(token: string): Promise<void> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new ValidationError(
      'This verification link is invalid or has expired.',
      'auth/invalid_verification_token',
    );
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);
}

/**
 * Change the signed-in user's password. Requires re-entering the current
 * password (defense against a hijacked/left-open session). Invalidates every
 * existing session and opens a fresh one for the device making the change —
 * same trade-off as {@link resetPassword}: every other logged-in device is
 * signed out, while this one keeps working via the rotated session cookie.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult> {
  if (currentPassword.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
      'auth/password_too_long',
    );
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new UnauthorizedError(
      'Current password is incorrect.',
      'auth/incorrect_current_password',
    );
  }
  assertPasswordLength(newPassword);

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  const session = await openSession(updated.id);
  return { user: updated, ...session };
}

/**
 * Change the signed-in user's email address. Requires re-entering the
 * current password. Existing sessions are left intact — unlike a password
 * change, a new email doesn't give an attacker anything they couldn't
 * already do with a stolen session token. The new address starts unverified
 * again; if `buildVerifyUrl` is given, a fresh verification email is sent to
 * it (best-effort, same as at signup — omit to skip, e.g. in tests).
 */
export async function changeEmail(
  userId: string,
  newEmail: string,
  currentPassword: string,
  buildVerifyUrl?: (token: string) => string,
): Promise<User> {
  if (currentPassword.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
      'auth/password_too_long',
    );
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new UnauthorizedError(
      'Current password is incorrect.',
      'auth/incorrect_current_password',
    );
  }

  const normalizedEmail = newEmail.trim().toLowerCase();
  assertEmailFormat(normalizedEmail);
  if (normalizedEmail === user.email) {
    throw new ValidationError('This is already your email address.', 'auth/email_unchanged');
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new ValidationError('An account with this email already exists.', 'auth/email_taken');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: normalizedEmail, emailVerifiedAt: null },
  });

  if (buildVerifyUrl) await issueVerificationEmail(updated.id, updated.email, buildVerifyUrl);

  return updated;
}

/**
 * Permanently delete a user and everything derived from their data (sessions,
 * subscription, transcriptions, usage logs — all cascade via the schema).
 * Any audio still on disk for an in-flight transcription is deleted first, so
 * nothing outlives the account record.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const pendingAudio = await prisma.transcription.findMany({
    where: { userId, audioPath: { not: null } },
    select: { audioPath: true },
  });
  await Promise.all(pendingAudio.map((t) => deleteAudio(t.audioPath)));

  await prisma.user.delete({ where: { id: userId } });
}

async function openSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { userId, tokenHash: sha256(token), expiresAt },
  });
  return { token, expiresAt };
}
