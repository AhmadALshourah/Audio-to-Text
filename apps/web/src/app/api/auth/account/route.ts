import { NextResponse } from 'next/server';
import { deleteAccount } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { clearSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * DELETE /api/auth/account — permanently delete the signed-in user's account
 * and everything derived from it (sessions, transcriptions, usage logs).
 */
export const DELETE = withErrorHandling(async () => {
  const userId = await requireUserId();
  await deleteAccount(userId);
  clearSessionCookie();
  return NextResponse.json({ ok: true });
});
