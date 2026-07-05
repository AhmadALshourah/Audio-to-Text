import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './session-cookie';

/** Set the session cookie (httpOnly, sameSite=lax, secure in production). */
export function setSessionCookie(token: string, expiresAt: Date): void {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}
