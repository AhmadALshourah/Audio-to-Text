'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={busy}
      className="text-sm font-medium text-gray-600 hover:text-black disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
