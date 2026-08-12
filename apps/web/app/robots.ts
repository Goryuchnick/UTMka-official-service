import type { MetadataRoute } from 'next'

/**
 * Индексируем инструмент, но не личные разделы: за кодовой фразой всё равно
 * ничего не отдаётся без куки, а в выдаче пустые «История» и «Шаблоны» только
 * размывают релевантность.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://utmka.alex-pronin.ru'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/login', '/history', '/templates'],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
