import type { Metadata } from 'next'

import { LoginScreen } from '@/components/LoginScreen'

export const metadata: Metadata = {
  title: 'Кодовая фраза — UTMka',
  description: 'Анонимный вход одной фразой: без почты, пароля и персональных данных.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginScreen />
}
