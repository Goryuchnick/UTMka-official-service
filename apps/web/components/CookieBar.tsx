'use client'

/**
 * Плашка про счётчик посещаемости.
 *
 * Появляется один раз, пока человек не ответил, и управляет настоящим
 * поведением: до «Согласен» Яндекс.Метрика не загружается вовсе (см.
 * `lib/consent.ts` и `Metrika.tsx`). Поэтому и текст прямой — не «мы ценим
 * вашу приватность», а что именно считаем и чего не делаем.
 *
 * Отказ ничего не ломает: инструмент целиком работает без счётчика, и это
 * сказано в самой плашке — иначе «Только необходимые» выглядит как кнопка
 * «сделать себе хуже».
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { setConsent, useConsent } from '@/lib/consent'
import { PixelIcon } from '@utmka/ui'

export function CookieBar() {
  const consent = useConsent()
  const pathname = usePathname()
  /* Гидратация: на сервере согласия нет, и без этой отсрочки плашка мигала бы
     на первом кадре даже у тех, кто давно ответил. */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  /* ⚠️ На странице «Что мы собираем» плашки нет намеренно. Человек пришёл туда
     читать именно про это — накрывать текст затемнением и требовать ответа
     раньше, чем он дочитает, значит мешать ровно тому, ради чего он пришёл.
     Выбор там делается переключателем внизу раздела про счётчик. */
  if (!mounted || consent !== 'unknown' || pathname === '/privacy') return null

  return (
    <>
      {/* Затемнение: выбор обязателен, пока он не сделан — приложение под
          плашкой не работает. Клик по подложке ничего не закрывает: «закрыть,
          не ответив» — это молчаливое согласие, а его мы не принимаем. */}
      <div className="cookiebar-back" aria-hidden="true" />

      <div
        className="cookiebar"
        role="dialog"
        aria-modal="true"
        aria-label="Счётчик посещаемости"
      >
        <span className="cookiebar__mark" aria-hidden="true">
          <PixelIcon name="shield" />
        </span>

        <p className="cookiebar__text">
          <b>Считаем визиты Яндекс.Метрикой</b> — сколько людей пришло и откуда. Ссылки, которые
          вы собираете, и кодовая фраза туда не попадают: запись экрана выключена, поля скрыты
          от счётчика. Без согласия он не загружается, и инструмент работает полностью.{' '}
          <Link href="/privacy">Подробнее</Link>
        </p>

        <div className="cookiebar__acts">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setConsent('denied')}
          >
            Только необходимое
          </button>
          <button
            type="button"
            className="btn btn--main"
            onClick={() => setConsent('granted')}
            autoFocus
          >
            Согласен
          </button>
        </div>
      </div>
    </>
  )
}
