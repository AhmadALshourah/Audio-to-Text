import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset, ValidationError } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { enforceRateLimit, clientIp } from '@/lib/rate-limit';
import { env } from '@/env';
import { resolveLocale } from '@/lib/locale';

export const runtime = 'nodejs';

/**
 * POST /api/auth/forgot-password — request a password-reset email. Always
 * responds `{ ok: true }` regardless of whether the address is registered,
 * so the response itself can't be used to enumerate accounts.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Generous but bounded: real users rarely retry more than a couple of times.
  enforceRateLimit(`forgot-password:${clientIp(req)}`, 5, 60 * 60 * 1000);

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const locale = resolveLocale(body?.locale);

  if (!email) {
    throw new ValidationError('Email is required.');
  }

  await requestPasswordReset(
    email,
    (token) => `${env.NEXT_PUBLIC_APP_URL}/${locale}/reset-password?token=${token}`,
  );

  return NextResponse.json({ ok: true });
});
