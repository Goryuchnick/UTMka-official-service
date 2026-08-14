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
import { UTM_KEYS } from '@utmka/core'

import { useConsent } from '@/lib/consent'

const COUNTER = process.env.NEXT_PUBLIC_YM_ID

/**
 * Параметры заготовки генератора (`/?url=…&source=…`). В них лежит РЕАЛЬНЫЙ
 * адрес кампании пользователя — так работают кнопки «в генератор» из истории
 * и шаблонов. В Метрику они уходить не должны: это ровно те данные, ради
 * которых мы отключили вебвизор.
 *
 * Собственные `utm_*` (реклама самой UTMka) называются иначе и остаются —
 * иначе счётчик потеряет источники нашего же трафика.
 */
const PRIVATE_PARAMS = new Set<string>(['url', ...UTM_KEYS])

/** Адрес страницы без пользовательских данных — то, что можно отдать счётчику. */
function safeHref(): string {
  const url = new URL(window.location.href)
  for (const key of PRIVATE_PARAMS) url.searchParams.delete(key)
  return url.toString()
}

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void
  }
}

export function Metrika() {
  const pathname = usePathname()
  const consent = useConsent()

  /* Переходы между экранами — фронт-роутинг, сама Метрика их не видит.
     Отдаём адрес БЕЗ параметров заготовки: в них адрес чужой кампании. */
  useEffect(() => {
    if (!COUNTER || consent !== 'granted' || typeof window === 'undefined') return
    window.ym?.(Number(COUNTER), 'hit', safeHref())
  }, [pathname, consent])

  /* ⚠️ Пока согласия нет — нет и счётчика: ни скрипта, ни пикселя в noscript.
     Это то, что делает плашку настоящей, а не картинкой. «Ещё не спросили»
     считается отказом до ответа, а не молчаливым согласием. */
  if (!COUNTER || consent !== 'granted') return null

  return (
    <>
      {/* ⚠️ id НЕ "ym": элемент с таким id браузер кладёт в window.ym (named access),
          и сниппет Метрики видит там DOM-узел вместо функции — счётчик молча
          не инициализируется, а в консоли «ym is not a function». */}
      <Script id="ym-counter" strategy="afterInteractive">
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
