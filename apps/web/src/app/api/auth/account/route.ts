import { NextRequest, NextResponse } from 'next/server';
import { deleteAccount } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { clearSessionCookie } from '@/lib/session';
import { enforceRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * DELETE /api/auth/account — permanently delete the signed-in user's account
 * and everything derived from it (sessions, transcriptions, usage logs).
 */
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  // Same treatment as the other auth endpoints, for consistency and to blunt
  // any scripted abuse of a leaked/stolen session.
  enforceRateLimit(`delete-account:${clientIp(req)}`, 5, 60 * 60 * 1000);

  const userId = await requireUserId();
  await deleteAccount(userId);
  clearSessionCookie();
  return NextResponse.json({ ok: true });
});
