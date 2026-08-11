import type { Metadata } from 'next'

import { HistoryScreen } from '@/components/HistoryScreen'

export const metadata: Metadata = {
  title: 'История ссылок — UTMka',
  description: 'Собранные ссылки с метками и датой: поиск, повтор запуска, выгрузка в JSON и CSV.',
  robots: { index: false, follow: false },
}

export default function HistoryPage() {
  return <HistoryScreen />
}
