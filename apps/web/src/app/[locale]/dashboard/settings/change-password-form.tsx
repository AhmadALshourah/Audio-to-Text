'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApiErrorMessage } from '@/lib/api-error';

export function ChangePasswordForm() {
  const t = useTranslations('settings');
  const translateApiError = useApiErrorMessage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(translateApiError(data?.error, t('genericError')));
      }
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold tracking-tight">{t('passwordTitle')}</h2>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t('currentPasswordLabel')}</span>
        <input
          type="password"
          required
          maxLength={128}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-accent"
          autoComplete="current-password"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t('newPasswordLabel')}</span>
        <input
          type="password"
          required
          minLength={8}
          maxLength={128}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-accent"
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
          className="rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-accent"
          autoComplete="new-password"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{t('passwordUpdated')}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-black disabled:opacity-50"
      >
        {submitting ? t('submitting') : t('savePassword')}
      </button>
    </form>
  );
}
