import type { Metadata } from 'next'

import { HelpScreen } from '@/components/HelpScreen'

export const metadata: Metadata = {
  title: 'Помощь — UTMka',
  description:
    'Что такое UTM-метки, чем source отличается от medium, какие ошибки ломают отчёт и что подставляют пресеты площадок.',
}

export default function HelpPage() {
  return <HelpScreen />
}
