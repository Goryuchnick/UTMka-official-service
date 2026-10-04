'use client'

import { useSyncExternalStore } from 'react'

/**
 * Открыт ли помощник.
 *
 * Стор живёт вне дерева: в «ПРОНИН-ОС» кнопка помощника — часть самого окна
 * (`Assistant`), а в «Простом» виде она стоит в шапке (`DeviceFrame`), далеко
 * от панели, которую открывает. Снапшот — примитив, кэш не нужен.
 */

let open = false

const listeners = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function setAssistantOpen(next: boolean | ((was: boolean) => boolean)): void {
  const value = typeof next === 'function' ? next(open) : next
  if (value === open) return
  open = value
  listeners.forEach((listener) => listener())
}

export function useAssistantOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false)
}
