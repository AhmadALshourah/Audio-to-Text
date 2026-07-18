'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useApiErrorMessage } from '@/lib/api-error';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const translateApiError = useApiErrorMessage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(translateApiError(data?.error, t('genericError')));
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t('forgotPasswordTitle')}
        </h1>
        <p className="mt-3 text-sm text-ink/70">{t('forgotPasswordSent')}</p>
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/sign-in" className="font-medium underline">
            {t('signInLink')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {t('forgotPasswordTitle')}
      </h1>
      <p className="mt-1 text-sm text-ink/70">{t('forgotPasswordSubtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('emailLabel')}</span>
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-accent"
            autoComplete="email"
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
          {submitting ? t('submitting') : t('sendResetLink')}
        </button>
      </form>

      <p className="mt-4 text-sm text-ink/60">
        <Link href="/sign-in" className="font-medium underline">
          {t('signInLink')}
        </Link>
      </p>
    </div>
  );
}
