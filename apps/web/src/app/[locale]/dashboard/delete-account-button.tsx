'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export function DeleteAccountButton() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(t('deleteConfirm'));
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
      className="inline-flex items-center gap-2 rounded-full border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
      {t('deleteAccount')}
    </button>
  );
}
