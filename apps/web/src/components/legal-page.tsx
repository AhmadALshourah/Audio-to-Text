import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

/** Shared shell for /privacy and /terms — simple header, prose-styled body. */
export async function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  const t = await getTranslations('legal');

  return (
    <>
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-sm font-semibold tracking-tight" dir="ltr">
          Audio→Text
        </Link>
        <Link href="/" className="text-sm text-ink/60 hover:text-ink">
          {t('backToHome')}
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink/40">
          {t('lastUpdated')}: {lastUpdated}
        </p>

        <div className="prose-legal mt-8 flex flex-col gap-6 text-ink/80">{children}</div>
      </main>
    </>
  );
}
