import { Suspense } from 'react'

import { GeneratorScreen } from '@utmka/ui'

/**
 * Генератор читает заготовку из адресной строки (`?url=…&source=…`), поэтому
 * стоит за Suspense: без границы `useSearchParams` увёл бы всю страницу
 * в динамический рендер ради разбора одной строки.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<p className="empty">Загружаю генератор…</p>}>
      <GeneratorScreen />
    </Suspense>
  )
}
