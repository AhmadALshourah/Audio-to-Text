'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === 'en' ? 'ar' : 'en';

  return (
    <button
      onClick={() => router.replace(pathname, { locale: next })}
      className="h-9 rounded-full border border-line px-3 font-mono text-xs font-medium tracking-wide text-ink/70 transition-colors hover:border-ink/40 hover:text-ink"
      aria-label={next === 'ar' ? 'التبديل للعربية' : 'Switch to English'}
    >
      {next === 'ar' ? 'ع' : 'EN'}
    </button>
  );
}
