import type { MetadataRoute } from 'next'

/** Только открытые экраны — те же, что разрешены в robots. */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://utmka.alex-pronin.ru'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    { url: SITE, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE}/batch`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/parse`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]
}
