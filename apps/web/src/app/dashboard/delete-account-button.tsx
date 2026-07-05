'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteAccountButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete your account permanently? This removes your transcription history and cannot be undone.',
    );
    if (!confirmed) return;

    setBusy(true);
    await fetch('/api/auth/account', { method: 'DELETE' });
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="text-xs text-red-600/70 hover:text-red-600 disabled:opacity-50"
    >
      Delete account
    </button>
  );
}
