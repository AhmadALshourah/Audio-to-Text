import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getQuotaStatus, listTranscriptions } from '@audio-to-text/core';
import { getCurrentUser } from '@/lib/auth';
import { serializeTranscription } from '@/lib/serializers';
import { redirect, Link } from '@/i18n/navigation';
import { DashboardClient } from './dashboard-client';
import { SignOutButton } from './sign-out-button';
import { DeleteAccountButton } from './delete-account-button';

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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-ink/70">{user.name ?? user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings" className="text-sm font-medium text-ink/60 hover:text-ink">
            {t('settings')}
          </Link>
          <SignOutButton />
        </div>
      </header>

      <DashboardClient
        initialQuota={quota}
        initialTranscriptions={transcriptions.map(serializeTranscription)}
        initialNextCursor={nextCursor}
      />

      <div className="mt-6 flex justify-center border-t border-ink/10 pt-4">
        <DeleteAccountButton />
      </div>
    </main>
  );
}
