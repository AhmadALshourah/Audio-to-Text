import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isProd = process.env.NODE_ENV === 'production';

// The app has no external script/style/font/image dependencies — next/font
// self-hosts fonts at build time, and OpenAI/Resend are only ever called
// server-side — so everything can be scoped to 'self'. 'unsafe-inline' on
// script-src is a known, deliberate gap: Next.js's own hydration/RSC payload
// relies on inline scripts, and closing this fully needs per-request nonce
// middleware we haven't built. Still meaningfully blocks any injected script
// from loading additional script/object/frame content from elsewhere.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

// Baseline security headers applied to every response. HSTS is prod-only —
// it only means anything over HTTPS, and forcing it in local dev risks a
// browser caching the policy for localhost.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // don't advertise the framework/version
  // Transpile shared workspace packages so Next can bundle their TS source.
  transpilePackages: ['@audio-to-text/shared', '@audio-to-text/db', '@audio-to-text/core'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  webpack: (config) => {
    // Our workspace packages use ESM-style `.js` specifiers that actually point
    // at `.ts` source. Teach webpack to resolve `.js` → `.ts` when bundling them.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
