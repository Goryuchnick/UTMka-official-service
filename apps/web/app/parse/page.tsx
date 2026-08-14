import type { Metadata } from 'next'

import { ParseScreen } from '@utmka/ui'

export const metadata: Metadata = {
  title: 'Разбор чужой ссылки',
  description:
    'Вставьте размеченную ссылку — покажем параметры таблицей и объясним, что в ней сломается: регистр, пробелы, кириллица, подмена типа трафика.',
  alternates: { canonical: '/parse' },
  openGraph: {
    title: 'Разбор ссылки — UTMka',
    description: 'Что за метки стоят в чужой ссылке и что из этого сломает отчёт.',
    url: '/parse',
  },
}

export default function ParsePage() {
  return <ParseScreen />
}
