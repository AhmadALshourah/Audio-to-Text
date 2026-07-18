import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AuthForm } from '../(auth)/auth-form';
import { AuthShell } from '../(auth)/auth-shell';

export const runtime = 'nodejs';

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (await getCurrentUser()) redirect({ href: '/dashboard', locale });
  return (
    <AuthShell>
      <Suspense>
        <AuthForm mode="sign-in" />
      </Suspense>
    </AuthShell>
  );
}
