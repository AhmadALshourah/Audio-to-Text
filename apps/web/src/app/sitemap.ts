import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const PAGES: Array<{ path: string; changeFrequency: 'weekly' | 'monthly'; priority: number }> = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/sign-up', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/sign-in', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) =>
    PAGES.map(({ path, changeFrequency, priority }) => ({
      url: `${APP_URL}/${locale}${path}`,
      changeFrequency,
      priority,
    })),
  );
}
