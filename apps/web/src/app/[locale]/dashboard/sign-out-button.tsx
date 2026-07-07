'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export function SignOutButton() {
  const t = useTranslations('dashboard');
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
      className="text-sm font-medium text-ink/60 hover:text-ink disabled:opacity-50"
    >
      {t('signOut')}
    </button>
  );
}
