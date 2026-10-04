'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Галочка «Транслитерация»: кириллица в метках сразу при наборе становится
 * латиницей — в генераторе и в пакете, а не только по кнопке «Чинить».
 * Многие пишут метки по-русски, и `осень` уезжает в отчёт процентной
 * кодировкой.
 *
 * Выключена по умолчанию: это выбор человека, а не правило. Дальше помним
 * его так же, как режим генератора; десктоп копирует ключ в свою базу
 * (`settings-sync.ts`).
 */

const KEY = 'utmka.translit'
const EVENT = 'utmka:translit'

function read(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

export function useTranslit(): { translit: boolean; setTranslit: (next: boolean) => void } {
  const translit = useSyncExternalStore(subscribe, read, () => false)

  const setTranslit = useCallback((next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off')
    } catch {
      // приватный режим — выбор не переживёт перезагрузку, это допустимо
    }
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return { translit, setTranslit }
}
