import type { Metadata } from 'next'

import { BatchScreen } from '@/components/BatchScreen'

export const metadata: Metadata = {
  title: 'Пакетный режим',
  description:
    'Двадцать ссылок за один заход: строки — площадки, столбцы — параметры. Проверка та же, что у одиночной ссылки, выгрузка в CSV.',
  alternates: { canonical: '/batch' },
  openGraph: {
    title: 'Пакетный режим — UTMka',
    description: 'Таблица площадок → готовый набор размеченных ссылок с выгрузкой в CSV.',
    url: '/batch',
  },
}

export default function BatchPage() {
  return <BatchScreen />
}
