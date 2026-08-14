import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LandingPage } from '@/components/landing/LandingPage'
import { getLanding, LANDINGS } from '@/lib/landings'

/**
 * Посадочные площадок: `/yandex-direct`, `/tilda`.
 *
 * Сегмент динамический, но список закрыт: `dynamicParams = false` — значит
 * страницы собираются заранее по реестру, а любой другой адрес отдаёт 404, а
 * не пустой лендинг. Статические маршруты (`/help`, `/parse`) приоритетнее
 * этого сегмента и им не перехватываются.
 */

export const dynamicParams = false

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://utmka.alex-pronin.ru'

export function generateStaticParams() {
  return LANDINGS.map((landing) => ({ platform: landing.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>
}): Promise<Metadata> {
  const { platform } = await params
  const landing = getLanding(platform)
  if (!landing) return {}

  const url = `/${landing.slug}`

  return {
    // Свой заголовок целиком, без шаблона «· UTMka»: место в выдаче
    // дороже отдать слову из запроса, чем названию инструмента.
    title: { absolute: landing.title },
    description: landing.description,
    keywords: [...landing.keywords],
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: landing.title,
      description: landing.description,
      url,
    },
  }
}

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ platform: string }>
}) {
  const { platform } = await params
  const landing = getLanding(platform)
  if (!landing) notFound()

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: landing.faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'UTMka', item: SITE },
        {
          '@type': 'ListItem',
          position: 2,
          name: landing.h1,
          item: `${SITE}/${landing.slug}`,
        },
      ],
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage landing={landing} />
    </>
  )
}
