import { NextRequest, NextResponse } from 'next/server';
import { registerUser, ValidationError } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { setSessionCookie } from '@/lib/session';
import { enforceRateLimit, clientIp } from '@/lib/rate-limit';
import { env } from '@/env';
import { resolveLocale } from '@/lib/locale';

export const runtime = 'nodejs';

/**
 * POST /api/auth/register — create an account, send a verification email,
 * and open a session (the account is usable immediately; verification is
 * informational, not a gate).
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Cap signups per IP to blunt automated account creation: 5 / hour.
  enforceRateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000);

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const name = typeof body?.name === 'string' ? body.name : undefined;
  const locale = resolveLocale(body?.locale);

  if (!email || !password) {
    throw new ValidationError('Email and password are required.');
  }

  const { token, expiresAt } = await registerUser(
    email,
    password,
    name,
    (verifyToken) => `${env.NEXT_PUBLIC_APP_URL}/${locale}/verify-email?token=${verifyToken}`,
  );
  setSessionCookie(token, expiresAt);
  return NextResponse.json({ ok: true });
});
