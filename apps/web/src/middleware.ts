import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { SESSION_COOKIE } from '@/lib/session-cookie';
// Imported for its module-load-time side effect: `apps/web/src/env.ts` calls
// `parseEnv` at the top level. Middleware matches almost every request and
// loads once at server start, so this is the earliest point that reliably
// runs for every request path — the closest thing this app has to a startup
// hook — making a missing/invalid env var fail fast instead of surfacing as
// a confusing runtime error deep inside a route handler.
import '@/env';

const handleI18nRouting = createIntlMiddleware(routing);

/**
 * Coarse auth gate, composed with next-intl's locale routing. Middleware runs
 * on the Edge runtime and can't touch the database, so it only checks whether
 * a session cookie is *present* and redirects to /sign-in if not. The real
 * validation (token → user, expiry) happens server-side in requireUserId()
 * on the protected page/route.
 */
const PUBLIC_PATHS = [
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/privacy',
  '/terms',
];

// Built from routing.locales (not hardcoded) so adding a locale can't
// silently desync the two places below that need to recognize one.
const LOCALE_PATTERN = routing.locales.join('|');
const LEADING_LOCALE_RE = new RegExp(`^/(${LOCALE_PATTERN})(/.*)?$`);

/** Strip a leading /en or /ar so path checks are locale-agnostic. */
function stripLocale(pathname: string): string {
  const match = pathname.match(LEADING_LOCALE_RE);
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

  // API routes aren't localized; let them run and return a real 401 via
  // requireUserId() rather than the i18n middleware touching them. Root-level
  // metadata files (sitemap.xml, robots.txt, ...) never reach this middleware
  // at all — see the `matcher` config below — so no auth/i18n branch is needed
  // for them here.
  if (pathname.startsWith('/api')) return NextResponse.next();

  if (isPublic(pathname)) return handleI18nRouting(req);

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const locale = pathname.match(LEADING_LOCALE_RE)?.[1] ?? routing.defaultLocale;
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return handleI18nRouting(req);
}

export const config = {
  // Excludes Next internals, common image extensions, and any root-level
  // metadata file (sitemap.xml, robots.txt, manifest.json, etc.) by its file
  // extension — a general rule, so a *new* metadata file with one of these
  // extensions is excluded automatically instead of needing a manual update
  // here every time one is added.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|xml|txt|json|webmanifest)).*)',
  ],
};
