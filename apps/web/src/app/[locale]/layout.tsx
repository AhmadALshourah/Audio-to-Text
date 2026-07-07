import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { PLAN_MONTHLY_MINUTES } from '@audio-to-text/shared/types';
import '../globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

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
    },
    twitter: {
      card: 'summary',
      title: t('title'),
      description,
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
    <html lang={locale} dir={dir} className={spaceGrotesk.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
