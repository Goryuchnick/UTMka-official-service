import type { Metadata } from 'next'

import { TemplatesScreen } from '@utmka/ui'

export const metadata: Metadata = {
  title: 'Шаблоны и справочник',
  description:
    'Сохранённые наборы меток с тегами и справочник значений: он показывает, где одно и то же написано по-разному.',
  robots: { index: false, follow: false },
}

export default function TemplatesPage() {
  return <TemplatesScreen />
}
