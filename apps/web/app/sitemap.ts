import type { MetadataRoute } from 'next'

import { LANDINGS } from '@/lib/landings'

/** Только открытые экраны — те же, что разрешены в robots. */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://utmka.alex-pronin.ru'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    { url: SITE, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    // Посадочные площадок идут сразу за главной: по запросам про площадку
    // приземляются именно они, а не универсальный генератор.
    ...LANDINGS.map((landing) => ({
      url: `${SITE}/${landing.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    { url: `${SITE}/batch`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/parse`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]
}
