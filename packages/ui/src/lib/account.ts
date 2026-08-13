'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

import { backend } from '../shell'

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
 *
 * ⚠️ Файл **не удаляется в десктопе**, а вырождается. Там `backend.account`
 * равен `null` — входа нет как понятия, — и стор сразу отвечает `'member'`.
 * Если вырезать его как ненужный, `QuickStart` и `SaveBar` вернут `null`, а
 * история с шаблонами нарисуют приглашение завести кодовую фразу: пользователь
 * десктопа увидит рекламу того, чего в его оболочке не существует. Молча, без
 * единой ошибки в консоли.
 */

export type AccountState = 'unknown' | 'guest' | 'member'

/** Входа нет как понятия — значит спрашивать некого и ждать нечего. */
const LOCAL_ONLY = backend.account === null

let state: AccountState = LOCAL_ONLY ? 'member' : 'unknown'
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
  if (LOCAL_ONLY) return Promise.resolve()
  if (loading && !force) return loading

  loading = backend
    .account!.state()
    .then((result) => {
      state = result.state
      storage = result.storage
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
  if (!backend.account) return
  await backend.account.logout()
  setAccount('guest')
}
