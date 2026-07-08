import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail, ValidationError } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { enforceRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** POST /api/auth/verify-email — consume an email-verification link. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  enforceRateLimit(`verify-email:${clientIp(req)}`, 10, 5 * 60 * 1000);

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';

  if (!token) {
    throw new ValidationError('A verification token is required.');
  }

  await verifyEmail(token);
  return NextResponse.json({ ok: true });
});
