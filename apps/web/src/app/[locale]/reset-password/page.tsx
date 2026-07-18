import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { ResetPasswordForm } from '../(auth)/reset-password-form';
import { AuthShell } from '../(auth)/auth-shell';

export const runtime = 'nodejs';

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AuthShell>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
