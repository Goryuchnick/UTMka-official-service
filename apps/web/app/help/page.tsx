import type { Metadata } from 'next'

import { HelpScreen } from '@utmka/ui'

export const metadata: Metadata = {
  title: 'Помощь',
  description:
    'Что такое UTM-метки, чем source отличается от medium, какие ошибки ломают отчёт и что подставляют пресеты площадок. Плюс обучение, версия для ПК и исходники.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Помощь — UTMka',
    description: 'Разбор параметров, частые ошибки и пресеты площадок — без ухода на другой сайт.',
    url: '/help',
  },
}

export default function HelpPage() {
  return <HelpScreen />
}
