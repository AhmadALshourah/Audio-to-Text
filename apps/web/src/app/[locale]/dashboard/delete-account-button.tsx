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
      className="text-xs text-red-600/70 hover:text-red-600 disabled:opacity-50"
    >
      {t('deleteAccount')}
    </button>
  );
}
