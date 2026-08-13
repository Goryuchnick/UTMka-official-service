'use client'

/**
 * Реализация контракта оболочки для веба: HTTP поверх роутов `/api/*`,
 * навигация поверх `next/navigation` и `next/link`.
 *
 * Единственное место в приложении, которое знает про `fetch`, пути, заголовки,
 * `JSON.stringify` и коды ответов. До этого всё перечисленное жило прямо в
 * экранах — вместе с ручным разбором `response.status === 401` и шестью
 * разными текстами про недоступную сеть.
 *
 * Роуты при этом **не меняются ни строкой**: переезжают только вызовы.
 * Десктоп подставит на место этого файла свой (`invoke` поверх SQLite), а
 * экраны не заметят подмены — они импортируют алиас `#shell`.
 */

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import type { Nav, NavLink as NavLinkType, UseNavParams } from '@utmka/ui'
import {
  BACKEND_MESSAGES,
  BackendError,
  HISTORY_LIMIT,
  type BriefAnswer,
  type BriefQuota,
  type DictEntry,
  type DictKind,
  type HistoryItem,
  type ImportResult,
  type SaveFile,
  type Template,
  type UtmkaBackend,
} from '@utmka/core'

/**
 * Один запрос к роуту. Здесь HTTP-семантика превращается в доменную ошибку —
 * дальше по коду её уже нет.
 */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      cache: 'no-store',
      ...init,
      headers:
        init?.body === undefined ? init?.headers : { 'content-type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new BackendError('offline', BACKEND_MESSAGES.offline)
  }

  const data = (await response.json().catch(() => ({}))) as { error?: string } & T

  if (response.ok) return data

  // 401 — не ошибка, а «фразы нет»: экраны отличают это по `kind`, а не по коду.
  if (response.status === 401) throw new BackendError('auth', BACKEND_MESSAGES.auth)
  if (response.status === 429) throw new BackendError('limit', data.error ?? BACKEND_MESSAGES.limit)

  throw new BackendError('rejected', data.error ?? BACKEND_MESSAGES.rejected)
}

/**
 * Уточнение доменного вида по тексту сервера.
 *
 * Роуты отвечают на конфликт имени и на потолок хранения обычным 400 — свой код
 * для них не заводился, а трогать серверную часть на этом шаге нельзя: весь
 * смысл этапа в том, что поведение прод-приложения не меняется ни на пиксель.
 * Тексты живут в ядре, поэтому сравнение идёт с ними, а не со строкой в файле.
 */
function refine(error: unknown): never {
  if (error instanceof BackendError && error.kind === 'rejected') {
    if (error.message.includes('таким названием уже есть')) {
      throw new BackendError('conflict', BACKEND_MESSAGES.conflict)
    }
    if (error.message.startsWith('Больше ')) {
      throw new BackendError('limit', error.message)
    }
  }
  throw error
}

/** Пакетная запись: в вебе это цикл — но внутри адаптера, а не в экране. */
async function importRows<T extends { name?: string; url?: string }>(
  rows: T[],
  write: (row: T) => Promise<unknown>,
): Promise<ImportResult> {
  let added = 0
  const skipped: string[] = []

  for (const row of rows) {
    try {
      await write(row)
      added += 1
    } catch (error) {
      /* Поимённо, а не числом: «загружено 8 из 13» не говорит, какие пять
         строк потерялись и почему (ARCHITECTURE §11, 2026-08-13). */
      const label = row.name ?? row.url ?? 'запись'
      const why = error instanceof BackendError ? error.message : 'не удалось записать'
      skipped.push(`${label} — ${why}`)
      // Отсутствие входа прерывает импорт целиком: продолжать бессмысленно.
      if (error instanceof BackendError && error.kind === 'auth') throw error
    }
  }

  return { added, skipped }
}

export const backend: UtmkaBackend = {
  /* Возможности оболочки, а не текущее состояние: `storage: true` означает
     «хранилище в вебе существует как понятие». Настроено ли оно в env —
     отвечает `account.state()`, потому что это меняется без пересборки. */
  caps: { auth: true, assistant: true, storage: true, fileSave: 'browser' },

  templates: {
    list: () => call<{ items: Template[] }>('/api/templates').then((data) => data.items ?? []),

    create: (input) =>
      call<{ item: Template }>('/api/templates', {
        method: 'POST',
        body: JSON.stringify(input),
      })
        .then((data) => data.item)
        .catch(refine),

    update: (id, patch) =>
      call<{ item: Template }>('/api/templates', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...patch }),
      })
        .then((data) => data.item)
        .catch(refine),

    remove: (id) =>
      call<void>(`/api/templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then(
        () => undefined,
      ),

    importMany: (rows) =>
      importRows(rows, (row) =>
        call<{ item: Template }>('/api/templates', {
          method: 'POST',
          body: JSON.stringify(row),
        }).catch(refine),
      ),
  },

  history: {
    list: (limit = HISTORY_LIMIT) =>
      call<{ items: HistoryItem[] }>(`/api/history?limit=${limit}`).then((data) => data.items ?? []),

    add: (input) =>
      call<{ item: HistoryItem }>('/api/history', {
        method: 'POST',
        body: JSON.stringify(input),
      })
        .then((data) => data.item)
        .catch(refine),

    remove: (id) =>
      call<void>(`/api/history?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then(
        () => undefined,
      ),

    clear: () => call<void>('/api/history', { method: 'DELETE' }).then(() => undefined),

    importMany: (rows) =>
      importRows(rows, (row) =>
        call<{ item: HistoryItem }>('/api/history', {
          method: 'POST',
          body: JSON.stringify(row),
        }).catch(refine),
      ),
  },

  dictionary: {
    list: () => call<{ items: DictEntry[] }>('/api/dictionary').then((data) => data.items ?? []),

    /* Главный путь наполнения — сохранение ссылки: `addHistory` вызывает
       `trackValues` сам. Эта ручка нужна, чтобы завести канон заранее, и ведёт
       в ту же функцию на сервере. */
    track: (params) =>
      call<void>('/api/dictionary', {
        method: 'POST',
        body: JSON.stringify({ track: params }),
      }).then(() => undefined),

    merge: (kind, alias, canonical) =>
      call<void>('/api/dictionary', {
        method: 'POST',
        body: JSON.stringify({ kind, alias, canonical }),
      }).then(() => undefined),

    remove: (kind: DictKind, value: string) =>
      call<void>(
        `/api/dictionary?kind=${encodeURIComponent(kind)}&value=${encodeURIComponent(value)}`,
        { method: 'DELETE' },
      ).then(() => undefined),
  },

  net: {
    shorten: (url) =>
      call<{ short: string }>('/api/shorten', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }).then((data) => data.short),

    checkRedirects: (url) =>
      call<{ report: Awaited<ReturnType<UtmkaBackend['net']['checkRedirects']>> }>(
        '/api/redirect-check',
        { method: 'POST', body: JSON.stringify({ url }) },
      ).then((data) => data.report),
  },

  account: {
    state: () =>
      call<{ user: unknown; storage?: boolean }>('/api/session').then((data) => ({
        state: data.user ? ('member' as const) : ('guest' as const),
        storage: data.storage !== false,
      })),

    login: (passphrase) =>
      call<void>('/api/session', {
        method: 'POST',
        body: JSON.stringify({ mode: 'login', passphrase }),
      }).then(() => undefined),

    register: () =>
      call<{ passphrase: string }>('/api/session', {
        method: 'POST',
        body: JSON.stringify({ mode: 'register' }),
      }),

    logout: () => call<void>('/api/session', { method: 'DELETE' }).then(() => undefined),
  },

  assistant: {
    quota: () => call<BriefQuota>('/api/assistant/brief'),

    brief: (text) =>
      call<BriefAnswer>('/api/assistant/brief', {
        method: 'POST',
        body: JSON.stringify({ brief: text }),
      }),
  },
}

/**
 * Сохранение файла в браузере: `Blob` + невидимая ссылка со скачиванием.
 * В окне Tauri это место занимает системный диалог — поэтому функция и живёт
 * в оболочке, а не в `exchange.ts` рядом с форматами.
 */
/** Навигация веба: путь и переход. Строку запроса читает `useNavParams`. */
export function useNav(): Nav {
  const pathname = usePathname()
  const router = useRouter()

  return useMemo(
    () => ({ path: pathname, go: (to: string) => router.push(to) }),
    [pathname, router],
  )
}

/**
 * Строка запроса. Отдельно от `useNav`, потому что `useSearchParams` выводит
 * компонент из статического рендера и требует границы Suspense — она уже стоит
 * вокруг генератора, единственного читателя. В рамке устройства этот хук
 * ронял пререндер страницы 404.
 *
 * Копия, а не `ReadonlyURLSearchParams` из Next: тип фреймворка в сигнатурах
 * экранов — тот же шов, что и прямой импорт роутера.
 */
export const useNavParams: UseNavParams = () => {
  const search = useSearchParams()
  return useMemo(() => new URLSearchParams(search.toString()), [search])
}

export const NavLink: NavLinkType = ({ to, children, ...rest }) => (
  <Link href={to} {...rest}>
    {children}
  </Link>
)

export const saveFile: SaveFile = async (name, mime, body) => {
  const blob =
    typeof body === 'string'
      ? new Blob([body], { type: `${mime};charset=utf-8` })
      : new Blob([body as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
