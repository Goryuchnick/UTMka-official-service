import type { MetadataRoute } from 'next'

import { HOME, LANDINGS } from '@/lib/landings'

/**
 * Только открытые экраны — те же, что разрешены в robots. `lastModified` — дата
 * правки текста, а не время сборки: иначе каждая выкатка «обновляет» все адреса.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://utmka.alex-pronin.ru'

/** Экраны инструментов последний раз менялись 04.10.2026. */
const TOOLS_UPDATED = '2026-10-04'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, lastModified: HOME.updatedAt, changeFrequency: 'monthly', priority: 1 },
    // Посадочные площадок идут сразу за главной: по запросам про площадку
    // приземляются именно они, а не универсальный генератор.
    ...LANDINGS.map((landing) => ({
      url: `${SITE}/${landing.slug}`,
      lastModified: landing.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    { url: `${SITE}/batch`, lastModified: TOOLS_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/parse`, lastModified: TOOLS_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/help`, lastModified: TOOLS_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
  ]
}
