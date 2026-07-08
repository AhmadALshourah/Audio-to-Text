'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useApiErrorMessage } from '@/lib/api-error';

interface ChangeEmailFormProps {
  currentEmail: string;
}

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
  const t = useTranslations('settings');
  const locale = useLocale();
  const translateApiError = useApiErrorMessage();
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: email, currentPassword: password, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(translateApiError(data?.error, t('genericError')));
      }
      setSuccess(true);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold tracking-tight">{t('emailTitle')}</h2>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t('emailLabel')}</span>
        <input
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-accent"
          autoComplete="email"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t('currentPasswordLabel')}</span>
        <input
          type="password"
          required
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-accent"
          autoComplete="current-password"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{t('emailUpdated')}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-black disabled:opacity-50"
      >
        {submitting ? t('submitting') : t('saveEmail')}
      </button>
    </form>
  );
}
