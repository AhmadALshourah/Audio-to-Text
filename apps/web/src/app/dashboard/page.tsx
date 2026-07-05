import { getQuotaStatus, listTranscriptions } from '@audio-to-text/core';
import { getCurrentUser } from '@/lib/auth';
import { serializeTranscription } from '@/lib/serializers';
import { DashboardClient } from './dashboard-client';
import { SignOutButton } from './sign-out-button';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const [quota, transcriptions] = await Promise.all([
    getQuotaStatus(user.id),
    listTranscriptions(user.id),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">{user.name ?? user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <DashboardClient
        initialQuota={quota}
        initialTranscriptions={transcriptions.map(serializeTranscription)}
      />
    </main>
  );
}
