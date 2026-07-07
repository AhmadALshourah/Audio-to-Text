import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getQuotaStatus, listTranscriptions } from '@audio-to-text/core';
import { getCurrentUser } from '@/lib/auth';
import { serializeTranscription } from '@/lib/serializers';
import { redirect } from '@/i18n/navigation';
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
  const [quota, transcriptions] = await Promise.all([
    getQuotaStatus(user.id),
    listTranscriptions(user.id),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-ink/50">{user.name ?? user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <DashboardClient
        initialQuota={quota}
        initialTranscriptions={transcriptions.map(serializeTranscription)}
      />

      <div className="mt-6 flex justify-center border-t border-ink/10 pt-4">
        <DeleteAccountButton />
      </div>
    </main>
  );
}
