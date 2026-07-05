import { NextRequest, NextResponse } from 'next/server';
import { registerUser, ValidationError } from '@audio-to-text/core';
import { withErrorHandling } from '@/lib/api';
import { setSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

/** POST /api/auth/register — create an account and open a session. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const name = typeof body?.name === 'string' ? body.name : undefined;

  if (!email || !password) {
    throw new ValidationError('Email and password are required.');
  }

  const { token, expiresAt } = await registerUser(email, password, name);
  setSessionCookie(token, expiresAt);
  return NextResponse.json({ ok: true });
});
