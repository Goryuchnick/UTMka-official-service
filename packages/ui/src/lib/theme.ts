'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Тема интерфейса. Хранится в localStorage и стемпится атрибутом на <html> —
 * тем же способом, что на сайте (ключ свой, выбор между проектами не шарится).
 *
 * Снапшот — примитив (строка), поэтому кэшировать его не нужно; для массивов
 * и объектов кэш по raw-строке обязателен, иначе бесконечный ре-рендер.
 */

export type Theme = 'dark' | 'light'

export const THEME_KEY = 'utmka.theme'

/** Скрипт no-FOUC: ставит тему до первой отрисовки. Встраивается в <head>. */
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}})()`

function read(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  window.addEventListener('storage', onChange)
  return () => {
    observer.disconnect()
    window.removeEventListener('storage', onChange)
  }
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, read, () => 'dark' as Theme)

  const toggle = useCallback(() => {
    const next: Theme = read() === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // приватный режим — тема просто не переживёт перезагрузку
    }
  }, [])

  return { theme, toggle }
}
