'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';

interface UserMenuProps {
  email: string;
  name: string | null;
}

/** Compact account chip that opens a menu (Settings, Sign out) — keeps those
 *  controls off the main canvas instead of scattered across the dashboard. */
export function UserMenu({ email, name }: UserMenuProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initial = (name?.trim()?.[0] ?? email[0] ?? '?').toUpperCase();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-full border border-line ps-1 pe-3 transition-colors hover:border-ink/40"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent font-mono text-xs font-semibold text-accent-contrast">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm text-ink/80 sm:block">{email}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-float"
        >
          <div className="border-b border-line px-4 py-3">
            {name && <p className="truncate text-sm font-medium">{name}</p>}
            <p className="truncate font-mono text-xs text-ink/55">{email}</p>
          </div>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/80 transition-colors hover:bg-paper-soft"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {t('settings')}
          </Link>
          <button
            onClick={signOut}
            disabled={busy}
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink/80 transition-colors hover:bg-paper-soft disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {t('signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
