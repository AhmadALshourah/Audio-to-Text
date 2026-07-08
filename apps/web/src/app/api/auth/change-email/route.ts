import { NextRequest, NextResponse } from 'next/server';
import { changeEmail, ValidationError } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { enforceRateLimit, clientIp } from '@/lib/rate-limit';
import { env } from '@/env';
import { resolveLocale } from '@/lib/locale';

export const runtime = 'nodejs';

/**
 * POST /api/auth/change-email — change the signed-in user's email address
 * and send a verification email to it. Requires the current password.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  enforceRateLimit(`change-email:${clientIp(req)}`, 10, 60 * 60 * 1000);

  const userId = await requireUserId();
  const body = await req.json().catch(() => null);
  const newEmail = typeof body?.newEmail === 'string' ? body.newEmail : '';
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const locale = resolveLocale(body?.locale);

  if (!newEmail || !currentPassword) {
    throw new ValidationError('New email and current password are required.');
  }

  const user = await changeEmail(
    userId,
    newEmail,
    currentPassword,
    (verifyToken) => `${env.NEXT_PUBLIC_APP_URL}/${locale}/verify-email?token=${verifyToken}`,
  );
  return NextResponse.json({ ok: true, email: user.email });
});
