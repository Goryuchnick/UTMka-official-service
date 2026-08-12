'use client'

/**
 * Яндекс.Метрика — только счёт визитов и источников.
 *
 * ⚠️ Вебвизор НЕ включаем ни здесь, ни в панели, и это не вкусовщина: в полях
 * инструмента живут реальные адреса кампаний пользователя и его кодовая фраза.
 * Запись сессий утащила бы всё это на сторону — при том, что весь смысл
 * инструмента в «мы о вас ничего не собираем». В счётчике 111529339 запись
 * сессий выключена (`arch_enabled: 0`); здесь — вторая линия обороны:
 * `webvisor: false` в инициализации, а на полях классы `ym-disable-keys`
 * и `ym-hide-content` (см. `.field input`, экран фразы, бриф помощника).
 *
 * Отключается переменной NEXT_PUBLIC_YM_ID: нет значения — нет счётчика.
 * Так локальная разработка не мусорит в статистику.
 */

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const COUNTER = process.env.NEXT_PUBLIC_YM_ID

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void
  }
}

export function Metrika() {
  const pathname = usePathname()

  /* Переходы между экранами — фронт-роутинг, сама Метрика их не видит. */
  useEffect(() => {
    if (!COUNTER || typeof window === 'undefined') return
    window.ym?.(Number(COUNTER), 'hit', window.location.href)
  }, [pathname])

  if (!COUNTER) return null

  return (
    <>
      <Script id="ym" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
        ym(${COUNTER}, "init", { defer: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://mc.yandex.ru/watch/${COUNTER}`}
          style={{ position: 'absolute', left: '-9999px' }}
          alt=""
        />
      </noscript>
    </>
  )
}
