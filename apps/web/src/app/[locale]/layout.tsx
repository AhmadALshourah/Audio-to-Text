import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans, JetBrains_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { cookies } from 'next/headers';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PLAN_MONTHLY_MINUTES } from '@audio-to-text/shared/types';
import { THEME_COOKIE } from '@/lib/theme';
import '../globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// Expressive editorial serif — the manuscript/codification voice of the brand.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Clean, precise workhorse for body + UI.
const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument',
  display: 'swap',
});

// Metadata, eyebrows, timestamps — the "instrument panel" voice.
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

// Full Arabic support (RTL) — swapped in for display + body under [dir=rtl].
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

const fontVars = `${fraunces.variable} ${instrument.variable} ${jetbrains.variable} ${plexArabic.variable}`;

// Applied before first paint on every hard load: read the theme cookie (or the
// OS preference on a first visit) and set the class, so the theme is correct
// even for statically-prerendered pages that couldn't know the per-user cookie
// at build time. The cookie also drives the server render (see below), which
// is what keeps a locale switch — it remounts <html> — from wiping the theme.
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);var t=m?m[1]:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');if(!m)document.cookie='theme='+t+';path=/;max-age=31536000;samesite=lax';}catch(e){}})();`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const description = t('description', { minutes: PLAN_MONTHLY_MINUTES.free });

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: t('title'),
      template: `%s · ${t('siteName')}`,
    },
    description,
    keywords: [
      'audio to text',
      'transcription',
      'speech to text',
      'whisper',
      'transcribe audio',
      'meeting transcription',
    ],
    openGraph: {
      type: 'website',
      url: APP_URL,
      siteName: t('siteName'),
      title: t('title'),
      description,
      images: [{ url: '/images/og-image.png', width: 1376, height: 768, alt: t('siteName') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description,
      images: ['/images/og-image.png'],
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this locale (next-intl requirement).
  setRequestLocale(locale);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  // Render the theme class server-side from the cookie so it's present from the
  // first byte and survives a locale switch (which remounts this layout).
  const isDark = cookies().get(THEME_COOKIE)?.value === 'dark';
  const htmlClass = isDark ? `${fontVars} dark` : fontVars;

  return (
    <html lang={locale} dir={dir} className={htmlClass} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
