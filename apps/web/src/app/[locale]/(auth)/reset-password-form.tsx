'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useApiErrorMessage } from '@/lib/api-error';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const translateApiError = useApiErrorMessage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(translateApiError(data?.error, t('genericError')));
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('resetPasswordTitle')}
        </h1>
        <p className="mt-3 text-sm text-danger">{t('resetPasswordMissingToken')}</p>
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/forgot-password" className="font-medium underline">
            {t('sendResetLink')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {t('resetPasswordTitle')}
      </h1>
      <p className="mt-1 text-sm text-ink/70">{t('resetPasswordSubtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('newPasswordLabel')}</span>
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-accent"
            autoComplete="new-password"
          />
          <span className="text-xs text-ink/65">{t('passwordHint')}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('confirmPasswordLabel')}</span>
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-accent"
            autoComplete="new-password"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-dark disabled:opacity-50"
        >
          {submitting ? t('submitting') : t('resetPasswordSubmit')}
        </button>
      </form>
    </div>
  );
}
