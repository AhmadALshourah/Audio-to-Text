'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useApiErrorMessage } from '@/lib/api-error';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailClient() {
  const t = useTranslations('auth');
  const translateApiError = useApiErrorMessage();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(translateApiError(data?.error, t('genericError')));
        setStatus('success');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('genericError'));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for this token
  }, [token]);

  return (
    <div className="w-full max-w-sm text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {t('verifyEmailTitle')}
      </h1>

      {status === 'verifying' && <p className="mt-3 text-sm text-ink/60">{t('verifyingEmail')}</p>}
      {status === 'success' && (
        <p className="mt-3 text-sm text-green-700">{t('emailVerified')}</p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-600">{error ?? t('verifyEmailMissingToken')}</p>
      )}

      <p className="mt-4 text-sm text-ink/60">
        <Link href="/dashboard" className="font-medium underline">
          {t('goToDashboard')}
        </Link>
      </p>
    </div>
  );
}
