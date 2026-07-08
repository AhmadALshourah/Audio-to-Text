import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// next-intl's own middleware is a well-tested third-party library, not our
// code — its real behavior also runs into an unrelated pnpm/Vitest module
// resolution issue when imported here. Stub it so these tests stay focused
// on *our* auth-gate + public-path classification logic, which is what
// actually needed coverage.
vi.mock('next-intl/middleware', () => ({
  default: () => () => NextResponse.next(),
}));

const { default: middleware } = await import('./middleware.js');
const { SESSION_COOKIE } = await import('./lib/session-cookie.js');

function requestFor(pathname: string, opts: { sessionToken?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.sessionToken) headers.cookie = `${SESSION_COOKIE}=${opts.sessionToken}`;
  return new NextRequest(new URL(pathname, 'http://localhost:3000'), { headers });
}

/** True for a response that's a 3xx redirect specifically to /sign-in. */
function redirectsToSignIn(res: Response): boolean {
  if (res.status < 300 || res.status >= 400) return false;
  const location = res.headers.get('location');
  return location !== null && new URL(location).pathname.endsWith('/sign-in');
}

describe('middleware', () => {
  it('lets /api/* requests through unconditionally, session or not', () => {
    const withoutSession = middleware(requestFor('/api/transcriptions'));
    const withSession = middleware(requestFor('/api/transcriptions', { sessionToken: 'tok' }));

    expect(redirectsToSignIn(withoutSession)).toBe(false);
    expect(redirectsToSignIn(withSession)).toBe(false);
  });

  it('does not gate public paths behind auth, with or without a locale prefix', () => {
    for (const path of ['/', '/en', '/sign-in', '/en/sign-in', '/ar/privacy', '/terms']) {
      const res = middleware(requestFor(path));
      expect(redirectsToSignIn(res)).toBe(false);
    }
  });

  it('does not gate the new auth flow pages (forgot/reset password, verify-email)', () => {
    for (const path of ['/en/forgot-password', '/en/reset-password', '/ar/verify-email']) {
      const res = middleware(requestFor(path));
      expect(redirectsToSignIn(res)).toBe(false);
    }
  });

  it('redirects an unauthenticated request for a protected path to sign-in', () => {
    const res = middleware(requestFor('/en/dashboard'));
    expect(redirectsToSignIn(res)).toBe(true);
  });

  it('preserves the locale and original path in the sign-in redirect', () => {
    const res = middleware(requestFor('/ar/dashboard/settings'));
    const location = new URL(res.headers.get('location')!);

    expect(location.pathname).toBe('/ar/sign-in');
    expect(location.searchParams.get('redirect')).toBe('/ar/dashboard/settings');
  });

  it('falls back to the default locale when the protected path has no locale prefix', () => {
    const res = middleware(requestFor('/dashboard'));
    const location = new URL(res.headers.get('location')!);

    expect(location.pathname).toBe('/en/sign-in');
  });

  it('does not redirect an authenticated request for a protected path to sign-in', () => {
    const res = middleware(requestFor('/en/dashboard', { sessionToken: 'a-real-looking-token' }));
    expect(redirectsToSignIn(res)).toBe(false);
  });
});
