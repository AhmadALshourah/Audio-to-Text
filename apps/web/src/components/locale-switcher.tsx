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
      className="text-sm text-ink/60 hover:text-ink"
      aria-label={next === 'ar' ? 'التبديل للعربية' : 'Switch to English'}
    >
      {next === 'ar' ? 'العربية' : 'EN'}
    </button>
  );
}
