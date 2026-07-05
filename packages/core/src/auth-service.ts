import { prisma, type User } from '@audio-to-text/db';
import { hashPassword, verifyPassword, generateToken, sha256 } from '@audio-to-text/shared/crypto';
import { ValidationError, UnauthorizedError } from './errors.js';

/** How long a session stays valid. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AuthResult {
  user: User;
  /** Raw session token to set in the client cookie (only returned here, never stored). */
  token: string;
  expiresAt: Date;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new user (email + password), provision a free subscription, and
 * open a session. Throws {@link ValidationError} on bad input or duplicate email.
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_RE.test(normalizedEmail)) {
    throw new ValidationError('Please enter a valid email address.');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new ValidationError('An account with this email already exists.');
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

  const session = await openSession(user.id);
  return { user, ...session };
}

/**
 * Verify credentials and open a session. Uses the same generic error for
 * "no such user" and "wrong password" so we don't leak which emails exist.
 */
export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new UnauthorizedError('Invalid email or password.');
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

async function openSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { userId, tokenHash: sha256(token), expiresAt },
  });
  return { token, expiresAt };
}
