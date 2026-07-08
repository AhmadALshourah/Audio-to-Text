import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { VerifyEmailClient } from '../(auth)/verify-email-client';

export const runtime = 'nodejs';

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <VerifyEmailClient />
      </Suspense>
    </main>
  );
}
