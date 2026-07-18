import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect, Link } from '@/i18n/navigation';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { UserMenu } from './user-menu';

export const runtime = 'nodejs';

/**
 * Shared shell for the whole authenticated app (dashboard + settings): a
 * sticky top bar with the wordmark on one side and account controls on the
 * other. Auth-gates the entire subtree in one place.
 */
export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: '/sign-in', locale });
    return null;
  }

  const tMeta = await getTranslations('metadata');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" aria-label={tMeta('siteName')}>
            <Logo label={tMeta('siteName')} />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            <div className="ms-1">
              <UserMenu email={user.email} name={user.name} />
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
