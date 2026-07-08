import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect, Link } from '@/i18n/navigation';
import { ChangeEmailForm } from './change-email-form';
import { ChangePasswordForm } from './change-password-form';

export const runtime = 'nodejs';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: '/sign-in', locale });
    return;
  }

  const t = await getTranslations('settings');

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 p-8">
      <header>
        <Link href="/dashboard" className="text-sm text-ink/70 underline">
          {t('backToDashboard')}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">{t('title')}</h1>
      </header>

      <ChangeEmailForm currentEmail={user.email} />

      <div className="border-t border-ink/10 pt-8">
        <ChangePasswordForm />
      </div>
    </main>
  );
}
