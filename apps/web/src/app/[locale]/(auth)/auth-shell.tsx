import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';

/**
 * Two-panel editorial auth layout: a branded "manuscript" panel (a large
 * Fraunces line over a faint waveform) beside the form. Replaces the lonely
 * centered card so signing in feels like part of the product, not a detour.
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const tMeta = await getTranslations('metadata');
  const tFooter = await getTranslations('footer');

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — hidden on small screens */}
      <aside className="relative hidden overflow-hidden bg-ink p-10 lg:flex lg:flex-col lg:justify-between">
        <Link href="/" aria-label={tMeta('siteName')} className="relative z-10">
          <span className="inline-flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="24" height="24" rx="6" className="fill-paper" />
              <rect x="7" y="7" width="1.8" height="12" rx="0.9" className="fill-accent" />
              <rect x="11" y="8" width="8" height="1.8" rx="0.9" className="fill-ink" />
              <rect x="11" y="12.1" width="8" height="1.8" rx="0.9" className="fill-ink" opacity="0.7" />
              <rect x="11" y="16.2" width="5" height="1.8" rx="0.9" className="fill-ink" opacity="0.45" />
            </svg>
            <span className="font-display text-[1.05rem] font-semibold tracking-tight text-paper">
              {tMeta('siteName')}
            </span>
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight text-paper">
            {tFooter('tagline')}
          </p>
        </div>

        <p className="relative z-10 font-mono text-xs text-paper/45">
          {tFooter('copyright', { year: new Date().getFullYear() })}
        </p>

        {/* faint waveform texture along the bottom */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex h-40 items-end gap-1 px-10 opacity-[0.12]">
          {Array.from({ length: 80 }).map((_, i) => (
            <span
              key={i}
              className="flex-1 rounded-full bg-paper"
              style={{ height: `${15 + Math.abs(Math.sin(i * 0.7)) * 80}%` }}
            />
          ))}
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Link href="/" className="lg:invisible" aria-label={tMeta('siteName')}>
            <Logo label={tMeta('siteName')} />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">{children}</div>
      </main>
    </div>
  );
}
