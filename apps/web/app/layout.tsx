import type { Metadata, Viewport } from 'next'
import { Press_Start_2P } from 'next/font/google'

import { DeviceFrame } from '@/components/DeviceFrame'
import { DRAFT_BOOTSTRAP } from '@/lib/draft-bootstrap'
import { THEME_BOOTSTRAP } from '@/lib/theme'

import './globals.css'

/* Пиксельный акцентный шрифт — тот же, что на сайте (`--font-pixel` в
   pronin-alex). Кириллица обязательна: интерфейс русский, а Karmatic Arcade
   объявляет кириллические коды пустыми глифами — текст просто исчезал. */
const pixelFont = Press_Start_2P({
  variable: '--font-pixel',
  subsets: ['latin', 'cyrillic'],
  weight: '400',
  display: 'swap',
})

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://utmka.alex-pronin.ru'

const DESCRIPTION =
  'Собирает корректные UTM-ссылки и объясняет, что сломается в отчёте: регистр, пробелы, кириллица, подмена типа трафика. Пакетный режим, разбор чужой ссылки, QR и справочник значений. Бесплатно, без регистрации.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'UTMka — конструктор UTM-меток',
    template: '%s · UTMka',
  },
  description: DESCRIPTION,
  applicationName: 'UTMka',
  keywords: [
    'utm конструктор',
    'генератор utm меток',
    'utm builder',
    'utm для яндекс директ',
    'utm для вконтакте',
    'проверка utm меток',
    'utmka',
  ],
  authors: [{ name: 'Александр Пронин', url: 'https://alex-pronin.ru' }],
  creator: 'Александр Пронин',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'UTMka',
    locale: 'ru_RU',
    url: SITE,
    title: 'UTMka — конструктор UTM-меток',
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  // Токены поддомена совпадают с апексом alex-pronin.ru — обе панели выдали те
  // же значения, что у сайта и курса (проверено запросом, а не скопировано).
  verification: {
    google: 'ctMT8aZ1ijkY5uacCWQL1Sf8fuiQseAjkZ-C5u_2WTA',
    yandex: '7169c240f5affe51',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a08',
  width: 'device-width',
  initialScale: 1,
}

/** Разметка приложения: поисковикам это инструмент, а не статья. */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'UTMka',
  alternateName: 'Конструктор UTM-меток',
  url: SITE,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Windows, macOS',
  inLanguage: 'ru-RU',
  description: DESCRIPTION,
  offers: { '@type': 'Offer', price: 0, priceCurrency: 'RUB' },
  author: { '@type': 'Person', name: 'Александр Пронин', url: 'https://alex-pronin.ru' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={pixelFont.variable}>
      <head>
        {/* Тема ставится до первой отрисовки — иначе светлая мигает тёмной. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {/* Заготовка снимается с адресной строки ДО счётчика: в ней реальный
            адрес кампании пользователя, а Метрика шлёт location.href сама. */}
        <script dangerouslySetInnerHTML={{ __html: DRAFT_BOOTSTRAP }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>
        <DeviceFrame>{children}</DeviceFrame>
      </body>
    </html>
  )
}
