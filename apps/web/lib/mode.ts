'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Режим генератора: простой (пошаговый) или расширенный (все поля сразу).
 *
 * Дефолт для первого визита — простой; дальше помним выбор. Оба режима делят
 * одну модель данных, поэтому переключение ничего не теряет.
 */

export type GeneratorMode = 'simple' | 'pro'

const MODE_KEY = 'utmka.mode'
const MODE_EVENT = 'utmka:mode'

function read(): GeneratorMode {
  if (typeof localStorage === 'undefined') return 'simple'
  try {
    return localStorage.getItem(MODE_KEY) === 'pro' ? 'pro' : 'simple'
  } catch {
    return 'simple'
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(MODE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(MODE_EVENT, onChange)
  }
}

export function useGeneratorMode(): { mode: GeneratorMode; setMode: (next: GeneratorMode) => void } {
  const mode = useSyncExternalStore(subscribe, read, () => 'simple' as GeneratorMode)

  const setMode = useCallback((next: GeneratorMode) => {
    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {
      // приватный режим — выбор не переживёт перезагрузку, это допустимо
    }
    window.dispatchEvent(new Event(MODE_EVENT))
  }, [])

  return { mode, setMode }
}
