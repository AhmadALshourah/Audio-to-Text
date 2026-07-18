import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans, JetBrains_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PLAN_MONTHLY_MINUTES } from '@audio-to-text/shared/types';
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

// Runs before first paint to apply the saved/system theme with no flash.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

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

  return (
    <html lang={locale} dir={dir} className={fontVars} suppressHydrationWarning>
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
