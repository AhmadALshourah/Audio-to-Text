import { NextRequest, NextResponse } from 'next/server';
import { resetPassword, ValidationError } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { setSessionCookie } from '@/lib/session';
import { enforceRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/auth/reset-password — consume a password-reset token, set the new
 * password, and open a fresh session for this device.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Throttle token-guessing attempts, same treatment as login.
  enforceRateLimit(`reset-password:${clientIp(req)}`, 10, 5 * 60 * 1000);

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!token || !password) {
    throw new ValidationError('A reset token and new password are required.');
  }

  const { token: sessionToken, expiresAt } = await resetPassword(token, password);
  setSessionCookie(sessionToken, expiresAt);
  return NextResponse.json({ ok: true });
});
