'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
}

export function AuthForm({ mode }: AuthFormProps) {
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
        throw new Error(data?.error?.message ?? 'Something went wrong.');
      }
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {isSignUp ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="mt-1 text-sm text-ink/50">
        {isSignUp ? 'Start transcribing in seconds — it’s free.' : 'Sign in to your dashboard.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {isSignUp && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Name (optional)</span>
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
          <span className="font-medium">Email</span>
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
          <span className="font-medium">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-ink/20 bg-paper px-3 py-2 outline-none focus:border-accent"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          {isSignUp && <span className="text-xs text-ink/40">At least 8 characters.</span>}
        </label>

        {isSignUp && (
          <label className="flex items-start gap-2 text-xs text-ink/60">
            <input type="checkbox" required className="mt-0.5 h-3.5 w-3.5 accent-accent" />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="font-medium underline" target="_blank">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-medium underline" target="_blank">
                Privacy Policy
              </Link>
              , and confirm I have the right to upload any audio I share.
            </span>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-black disabled:opacity-50"
        >
          {submitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-ink/60">
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don’t have an account?{' '}
            <Link href="/sign-up" className="font-medium underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
