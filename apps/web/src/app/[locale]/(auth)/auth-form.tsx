'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeRedirectPath } from '@/lib/safe-redirect';

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
}

export function AuthForm({ mode }: AuthFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'sign-up';
  const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSignUp ? { email, password, name } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message ?? t('genericError'));
      }
      const redirect = safeRedirectPath(searchParams.get('redirect'), '/dashboard');
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {isSignUp ? t('signUpTitle') : t('signInTitle')}
      </h1>
      <p className="mt-1 text-sm text-ink/50">
        {isSignUp ? t('signUpSubtitle') : t('signInSubtitle')}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {isSignUp && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t('nameLabel')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-accent"
              autoComplete="name"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('emailLabel')}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-accent"
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('passwordLabel')}</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-accent"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          {isSignUp && <span className="text-xs text-ink/40">{t('passwordHint')}</span>}
        </label>

        {isSignUp && (
          <label className="flex items-start gap-2 text-xs text-ink/60">
            <input type="checkbox" required className="mt-0.5 h-3.5 w-3.5 accent-accent" />
            <span>
              {t('consentPrefix')}{' '}
              <Link href="/terms" className="font-medium underline" target="_blank">
                {t('termsLink')}
              </Link>{' '}
              {t('consentAnd')}{' '}
              <Link href="/privacy" className="font-medium underline" target="_blank">
                {t('privacyLink')}
              </Link>
              {t('consentSuffix')}
            </span>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-black disabled:opacity-50"
        >
          {submitting ? t('submitting') : isSignUp ? t('createAccount') : t('signIn')}
        </button>
      </form>

      <p className="mt-4 text-sm text-ink/60">
        {isSignUp ? (
          <>
            {t('alreadyHaveAccount')}{' '}
            <Link href="/sign-in" className="font-medium underline">
              {t('signInLink')}
            </Link>
          </>
        ) : (
          <>
            {t('noAccount')}{' '}
            <Link href="/sign-up" className="font-medium underline">
              {t('signUpLink')}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
