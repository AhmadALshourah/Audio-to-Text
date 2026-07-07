import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { SESSION_COOKIE } from '@/lib/session-cookie';

const handleI18nRouting = createIntlMiddleware(routing);

/**
 * Coarse auth gate, composed with next-intl's locale routing. Middleware runs
 * on the Edge runtime and can't touch the database, so it only checks whether
 * a session cookie is *present* and redirects to /sign-in if not. The real
 * validation (token → user, expiry) happens server-side in requireUserId()
 * on the protected page/route.
 */
const PUBLIC_PATHS = ['/', '/sign-in', '/sign-up', '/privacy', '/terms'];

/** Root-level special files that must never go through locale routing. */
const NON_LOCALIZED_PATHS = ['/sitemap.xml', '/robots.txt'];

/** Strip a leading /en or /ar so path checks are locale-agnostic. */
function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(en|ar)(\/.*)?$/);
  if (!match) return pathname;
  return match[2] || '/';
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(stripLocale(pathname))) return true;
  // Auth API + Next internals + static assets are always reachable.
  return pathname.startsWith('/api/auth') || pathname.startsWith('/_next');
}

export default function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // API routes and root-level special files (sitemap, robots) aren't
  // localized; let them pass straight through, untouched by next-intl's
  // routing, which would otherwise try to add a locale prefix.
  if (pathname.startsWith('/api') || NON_LOCALIZED_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) return handleI18nRouting(req);

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const locale = pathname.match(/^\/(en|ar)/)?.[1] ?? routing.defaultLocale;
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return handleI18nRouting(req);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)).*)'],
};
