'use client'

import { useSyncExternalStore } from 'react'

/**
 * Согласие на счётчик посещаемости.
 *
 * ⚠️ Плашка здесь не декоративная: **до ответа счётчик не загружается вообще**.
 * Плашка, которая просто сообщает «мы используем cookie», а трекер грузит сразу,
 * — обман в чистом виде, и особенно нелепый в инструменте, который обещает
 * «мы о вас ничего не собираем».
 *
 * Отсюда и три состояния, а не два: «ещё не спросили» — это не «отказано».
 * Пока человек не ответил, счётчика нет, но и решение за него не принято.
 */

export type Consent = 'unknown' | 'granted' | 'denied'

const KEY = 'utmka.consent.v1'
const EVENT = 'utmka:consent'

export function readConsent(): Consent {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'granted' || value === 'denied' ? value : 'unknown'
  } catch {
    // Приватный режим или заблокированное хранилище: считаем, что не спросили,
    // — то есть счётчик не грузим. В сомнении выбираем меньшее знание о человеке.
    return 'unknown'
  }
}

export function setConsent(value: Exclude<Consent, 'unknown'>): void {
  try {
    localStorage.setItem(KEY, value)
  } catch {
    /* не сохранилось — спросим в следующий раз, это не повод падать */
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange)
  // Соседняя вкладка: ответили там — здесь тоже должно примениться.
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** На сервере согласия нет по определению — там и счётчика нет. */
const NOT_ON_SERVER = (): Consent => 'unknown'

export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, readConsent, NOT_ON_SERVER)
}
