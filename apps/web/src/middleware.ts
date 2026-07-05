import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Coarse auth gate. Middleware runs on the Edge runtime and can't touch the
 * database, so it only checks whether a session cookie is *present* and
 * redirects to /sign-in if not. The real validation (token → user, expiry)
 * happens server-side in requireUserId() on the protected page/route.
 */
const PUBLIC_PATHS = ['/', '/sign-in', '/sign-up', '/privacy', '/terms'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Auth API + Next internals + static assets are always reachable.
  return pathname.startsWith('/api/auth') || pathname.startsWith('/_next');
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // Protected API routes: let them run and return a real 401 via requireUserId.
  if (pathname.startsWith('/api')) return NextResponse.next();

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)).*)'],
};
