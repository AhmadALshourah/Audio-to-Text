import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { SESSION_COOKIE } from '@/lib/auth';
import { clearSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

/** POST /api/auth/logout — invalidate the session and clear the cookie. */
export const POST = withErrorHandling(async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await destroySession(token);
  clearSessionCookie();
  return NextResponse.json({ ok: true });
});
