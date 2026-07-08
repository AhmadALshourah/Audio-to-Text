import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { ResetPasswordForm } from '../(auth)/reset-password-form';

export const runtime = 'nodejs';

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
