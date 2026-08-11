'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

/**
 * Реплика помощника. Живёт вне дерева экранов: планка с маскотом прибита
 * к шапке устройства (DeviceFrame), а текст ей сообщает текущий экран.
 *
 * Стор — примитив (строка), поэтому кэшировать снапшот не нужно.
 */

const DEFAULT_LINE = 'Соберём ссылку. Начнём с адреса — куда ведём людей.'

let line = DEFAULT_LINE
const listeners = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

/** Прочитать текущую реплику (для планки в шапке). */
export function useMascotLine(): string {
  return useSyncExternalStore(subscribe, () => line, () => DEFAULT_LINE)
}

/** Сообщить реплику с экрана. Пустая строка возвращает текст по умолчанию. */
export function useSetMascotLine(next: string): void {
  const set = useCallback((value: string) => {
    line = value || DEFAULT_LINE
    emit()
  }, [])

  useEffect(() => {
    set(next)
  }, [next, set])
}
