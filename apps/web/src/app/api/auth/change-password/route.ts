import { NextRequest, NextResponse } from 'next/server';
import { changePassword, ValidationError } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { setSessionCookie } from '@/lib/session';
import { enforceRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/auth/change-password — change the signed-in user's password.
 * Requires the current password. Rotates the session cookie for this device
 * (every other device is signed out — see changePassword's doc comment).
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  enforceRateLimit(`change-password:${clientIp(req)}`, 10, 60 * 60 * 1000);

  const userId = await requireUserId();
  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current and new password are required.');
  }

  const { token, expiresAt } = await changePassword(userId, currentPassword, newPassword);
  setSessionCookie(token, expiresAt);
  return NextResponse.json({ ok: true });
});
