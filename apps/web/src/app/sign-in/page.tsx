import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AuthForm } from '../(auth)/auth-form';

export const runtime = 'nodejs';

export default async function SignInPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <AuthForm mode="sign-in" />
      </Suspense>
    </main>
  );
}
