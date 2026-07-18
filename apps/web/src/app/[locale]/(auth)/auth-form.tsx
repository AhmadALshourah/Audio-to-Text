'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { useApiErrorMessage } from '@/lib/api-error';

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
}

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-accent';

export function AuthForm({ mode }: AuthFormProps) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const translateApiError = useApiErrorMessage();
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
        body: JSON.stringify(isSignUp ? { email, password, name, locale } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(translateApiError(data?.error, t('genericError')));
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
      <span className="eyebrow">{isSignUp ? t('signUpLink') : t('signInLink')}</span>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
        {isSignUp ? t('signUpTitle') : t('signInTitle')}
      </h1>
      <p className="mt-2 text-sm text-ink/65">
        {isSignUp ? t('signUpSubtitle') : t('signInSubtitle')}
      </p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
        {isSignUp && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('nameLabel')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="name"
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('emailLabel')}</span>
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="flex items-center justify-between font-medium">
            {t('passwordLabel')}
            {!isSignUp && (
              <Link
                href="/forgot-password"
                className="text-xs font-normal text-ink/60 underline underline-offset-2 hover:text-ink"
              >
                {t('forgotPassword')}
              </Link>
            )}
          </span>
          <input
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          {isSignUp && <span className="text-xs text-ink/55">{t('passwordHint')}</span>}
        </label>

        {isSignUp && (
          <label className="flex items-start gap-2 text-xs text-ink/65">
            <input type="checkbox" required className="mt-0.5 h-3.5 w-3.5 accent-accent" />
            <span>
              {t('consentPrefix')}{' '}
              <Link href="/terms" className="font-medium underline underline-offset-2" target="_blank">
                {t('termsLink')}
              </Link>{' '}
              {t('consentAnd')}{' '}
              <Link href="/privacy" className="font-medium underline underline-offset-2" target="_blank">
                {t('privacyLink')}
              </Link>
              {t('consentSuffix')}
            </span>
          </label>
        )}

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-dark disabled:opacity-50"
        >
          {submitting ? t('submitting') : isSignUp ? t('createAccount') : t('signIn')}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/60">
        {isSignUp ? (
          <>
            {t('alreadyHaveAccount')}{' '}
            <Link href="/sign-in" className="font-medium text-accent-dark underline underline-offset-2">
              {t('signInLink')}
            </Link>
          </>
        ) : (
          <>
            {t('noAccount')}{' '}
            <Link href="/sign-up" className="font-medium text-accent-dark underline underline-offset-2">
              {t('signUpLink')}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
