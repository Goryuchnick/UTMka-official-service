'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

/**
 * Состояние входа на клиенте.
 *
 * Стор внешний, а не контекст: знать про вход нужно и планке состояния в
 * рамке устройства, и экранам, и приглашению в генераторе — тянуть ради
 * этого провайдер через всё дерево смысла нет.
 *
 * Снапшот кэшируется по «сырому» значению: `useSyncExternalStore` сравнивает
 * ссылки, и новый объект на каждый вызов дал бы бесконечный ре-рендер —
 * грабли, уже собранные на закладках курса.
 */

export type AccountState = 'unknown' | 'guest' | 'member'

let state: AccountState = 'unknown'
/** Хранилище вообще настроено. Пока не знаем — считаем, что да. */
let storage = true
let snapshot: { state: AccountState; storage: boolean } = { state, storage }

const listeners = new Set<() => void>()
const SERVER_SNAPSHOT: { state: AccountState; storage: boolean } = { state: 'unknown', storage: true }

function emit(): void {
  snapshot = { state, storage }
  for (const listener of listeners) listener()
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

let loading: Promise<void> | null = null

/** Спрашивает сервер о сессии. Повторные вызовы переиспользуют один запрос. */
export function refreshAccount(force = false): Promise<void> {
  if (loading && !force) return loading
  loading = fetch('/api/session', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : { user: null, storage: false }))
    .then((data: { user: unknown; storage?: boolean }) => {
      state = data.user ? 'member' : 'guest'
      storage = data.storage !== false
      emit()
    })
    .catch(() => {
      state = 'guest'
      emit()
    })
    .finally(() => {
      loading = null
    })
  return loading
}

/** Пометить вход/выход, не дожидаясь ответа сервера. */
export function setAccount(next: AccountState): void {
  state = next
  emit()
}

export function useAccount(): { state: AccountState; storage: boolean; refresh: () => void } {
  const value = useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT)

  useEffect(() => {
    if (state === 'unknown') void refreshAccount()
  }, [])

  const refresh = useCallback(() => {
    void refreshAccount(true)
  }, [])

  return { state: value.state, storage: value.storage, refresh }
}

export async function logout(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' })
  setAccount('guest')
}
