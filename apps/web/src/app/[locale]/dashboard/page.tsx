import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getQuotaStatus, listTranscriptions } from '@audio-to-text/core';
import { getCurrentUser } from '@/lib/auth';
import { serializeTranscription } from '@/lib/serializers';
import { redirect } from '@/i18n/navigation';
import { DashboardClient } from './dashboard-client';

export const runtime = 'nodejs';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: '/sign-in', locale });
    return;
  }

  const t = await getTranslations('dashboard');
  const [quota, { items: transcriptions, nextCursor }] = await Promise.all([
    getQuotaStatus(user.id),
    listTranscriptions(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8">
        <span className="eyebrow">{t('title')}</span>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          {t('greeting', { name: user.name?.trim() || user.email.split('@')[0] || user.email })}
        </h1>
      </div>

      <DashboardClient
        initialQuota={quota}
        initialTranscriptions={transcriptions.map(serializeTranscription)}
        initialNextCursor={nextCursor}
      />
    </main>
  );
}
