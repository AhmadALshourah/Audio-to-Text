import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, ValidationError } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { setSessionCookie } from '@/lib/session';
import { enforceRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** POST /api/auth/login — verify credentials and open a session. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Throttle brute-force / credential-stuffing: 10 attempts / 5 min per IP.
  enforceRateLimit(`login:${clientIp(req)}`, 10, 5 * 60 * 1000);

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    throw new ValidationError('Email and password are required.');
  }

  const { token, expiresAt } = await authenticateUser(email, password);
  setSessionCookie(token, expiresAt);
  return NextResponse.json({ ok: true });
});
