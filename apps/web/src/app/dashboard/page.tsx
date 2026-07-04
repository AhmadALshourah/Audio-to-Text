import { UserButton } from '@clerk/nextjs';
import { getQuotaStatus, listTranscriptions } from '@audio-to-text/core';
import { requireUserId } from '@/lib/auth';
import { serializeTranscription } from '@/lib/serializers';
import { DashboardClient } from './dashboard-client';

export const runtime = 'nodejs';

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [quota, transcriptions] = await Promise.all([
    getQuotaStatus(userId),
    listTranscriptions(userId),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <UserButton />
      </header>

      <DashboardClient
        initialQuota={quota}
        initialTranscriptions={transcriptions.map(serializeTranscription)}
      />
    </main>
  );
}
