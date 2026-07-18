import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ForgotPasswordForm } from '../(auth)/forgot-password-form';
import { AuthShell } from '../(auth)/auth-shell';

export const runtime = 'nodejs';

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (await getCurrentUser()) redirect({ href: '/dashboard', locale });
  return (
    <AuthShell>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
