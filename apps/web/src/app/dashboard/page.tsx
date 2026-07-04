import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';

/** Minimal protected page — proves auth + middleware work. Phase 7 builds the
 * real dashboard (upload, history, quota). */
export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <UserButton />
      </header>
      <p className="text-gray-600">
        Signed in as <span className="font-medium">{user?.firstName ?? 'there'}</span>. The upload
        UI and transcription history land in Phase 7.
      </p>
    </main>
  );
}
