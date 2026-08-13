'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Режим отображения списков — список / плитки / таблица.
 *
 * Паритет с 2.2: режим выбирается отдельно для истории и для шаблонов и
 * запоминается. Живёт в localStorage, потому что это настройка интерфейса,
 * а не пользовательские данные (те — только за фразой, ARCHITECTURE §5.1).
 */

export type ViewMode = 'list' | 'grid' | 'table'

export type ViewScope = 'history' | 'templates'

const EVENT = 'utmka:view'

const cache = new Map<ViewScope, ViewMode>()

function key(scope: ViewScope): string {
  return `utmka.view.${scope}`
}

function read(scope: ViewScope): ViewMode {
  const cached = cache.get(scope)
  if (cached) return cached

  let value: ViewMode = 'list'
  try {
    const stored = localStorage.getItem(key(scope))
    if (stored === 'grid' || stored === 'table' || stored === 'list') value = stored
  } catch {
    /* приватный режим — остаёмся на списке */
  }
  cache.set(scope, value)
  return value
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

export function useViewMode(scope: ViewScope): { view: ViewMode; setView: (next: ViewMode) => void } {
  const view = useSyncExternalStore(
    subscribe,
    () => read(scope),
    () => 'list' as ViewMode,
  )

  const setView = useCallback(
    (next: ViewMode) => {
      cache.set(scope, next)
      try {
        localStorage.setItem(key(scope), next)
      } catch {
        /* не смогли запомнить — не беда */
      }
      window.dispatchEvent(new Event(EVENT))
    },
    [scope],
  )

  return { view, setView }
}
