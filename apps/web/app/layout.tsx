import type { Metadata, Viewport } from 'next'
import { Press_Start_2P } from 'next/font/google'

import { DeviceFrame } from '@/components/DeviceFrame'
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

export const metadata: Metadata = {
  title: 'UTMka — конструктор UTM-меток',
  description:
    'Собирает корректные UTM-ссылки и объясняет, что сломается в отчёте: регистр, пробелы, кириллица, подмена типа трафика. Бесплатно, без регистрации.',
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0a0a08',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={pixelFont.variable}>
      <head>
        {/* Тема ставится до первой отрисовки — иначе светлая мигает тёмной. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <DeviceFrame>{children}</DeviceFrame>
      </body>
    </html>
  )
}
