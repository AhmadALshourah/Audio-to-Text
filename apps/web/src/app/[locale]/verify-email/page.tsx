import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { VerifyEmailClient } from '../(auth)/verify-email-client';
import { AuthShell } from '../(auth)/auth-shell';

export const runtime = 'nodejs';

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AuthShell>
      <Suspense>
        <VerifyEmailClient />
      </Suspense>
    </AuthShell>
  );
}
