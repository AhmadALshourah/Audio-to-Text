import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${APP_URL}/sign-up`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${APP_URL}/sign-in`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
