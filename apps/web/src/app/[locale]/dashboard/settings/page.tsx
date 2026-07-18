import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from '@/i18n/navigation';
import { ChangeEmailForm } from './change-email-form';
import { ChangePasswordForm } from './change-password-form';
import { DeleteAccountButton } from '../delete-account-button';

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
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-8">
        <span className="eyebrow">{t('title')}</span>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
      </header>

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <ChangeEmailForm currentEmail={user.email} />
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <ChangePasswordForm />
        </section>

        {/* Danger zone — the destructive action, deliberately set apart. */}
        <section className="rounded-2xl border border-danger/30 bg-danger-soft/40 p-6">
          <h2 className="font-display text-lg font-semibold text-danger">{t('dangerTitle')}</h2>
          <p className="mt-1.5 max-w-md text-sm text-ink/70">{t('dangerDescription')}</p>
          <div className="mt-4">
            <DeleteAccountButton />
          </div>
        </section>
      </div>
    </main>
  );
}
