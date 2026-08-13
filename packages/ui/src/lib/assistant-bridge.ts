'use client'

/**
 * Мост между помощником и пакетным режимом.
 *
 * Помощник живёт в рамке устройства и не знает про экраны, а пакетный режим —
 * обычный экран со своим состоянием. Гонять их через адресную строку нельзя:
 * таблица на два десятка строк в URL не влезет. Поэтому — маленький внешний
 * стор: помощник кладёт разобранный пакет, экран забирает.
 *
 * Значение одноразовое: забрали — очистили. Иначе при следующем заходе на
 * /batch таблица заполнилась бы сама собой, и человек бы не понял, откуда.
 */

import { useSyncExternalStore } from 'react'

export interface BriefRow {
  platform: string
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
}

let pending: BriefRow[] | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

/** Помощник: отдать пакет экрану. */
export function handOffToBatch(rows: BriefRow[]): void {
  pending = rows.length > 0 ? rows : null
  emit()
}

/** Экран: есть ли что забрать. */
export function useBatchHandOff(): BriefRow[] | null {
  return useSyncExternalStore(subscribe, () => pending, () => null)
}

/**
 * Экран: очистить мост. Вызывается при уходе с пакетного режима — пока экран
 * открыт, значение должно жить, иначе таблица пропадёт под руками. Чтение
 * само по себе ничего не сбрасывает: побочный эффект в рендере ломается на
 * повторных вызовах, которыми React пользуется свободно.
 */
export function clearBatchHandOff(): void {
  if (pending === null) return
  pending = null
  emit()
}

/** Строки пакета → CSV в том же формате, что ждёт `batchFromCsv`. */
export function rowsToCsv(rows: BriefRow[]): string {
  const head = 'Метка,Источник,Канал,Кампания,Содержание,Ключевое слово'
  const escape = (value: string): string => (/[",]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  const body = rows.map((row) =>
    [row.platform, row.source ?? '', row.medium ?? '', row.campaign ?? '', row.content ?? '', row.term ?? '']
      .map((cell) => escape(cell))
      .join(','),
  )
  return [head, ...body].join('\n')
}
