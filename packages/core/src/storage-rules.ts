/**
 * Правила хранения — одни на веб и десктоп.
 *
 * Раньше они жили в `apps/web/lib/store.ts` вперемешку с запросами к Supabase,
 * и все считали их «ядром». Если бы десктоп переписал их на Rust «по смыслу»,
 * оболочки разошлись бы ровно в том, ради чего создавался монорепо: потолок
 * истории, потолок шаблонов, наполнение справочника и тексты отказов.
 *
 * Здесь чистые функции над данными — без сети и хранилища. Реализация решает,
 * чем их применить: Supabase-запросом или транзакцией SQLite.
 */

import { HISTORY_LIMIT, TEMPLATES_LIMIT, type HistoryItem } from './repository'
import { UTM_KEYS, type DictEntry, type UtmParams } from './types'

/**
 * Обрезать историю до потолка.
 *
 * ⚠️ Порядок — по дате **и** по позиции: при совпадении миллисекунды (импорт
 * файла кладёт пачку строк одним махом) сортировка только по `createdAt`
 * неопределена, и вытеснится случайная запись. В SQLite ту же роль играет
 * `rowid` как разрыв ничьей.
 */
export function applyHistoryLimit<T extends { createdAt?: string }>(
  list: readonly T[],
  limit: number = HISTORY_LIMIT,
): T[] {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const at = Date.parse(b.item.createdAt ?? '') - Date.parse(a.item.createdAt ?? '')
      return Number.isNaN(at) || at === 0 ? a.index - b.index : at
    })
    .slice(0, limit)
    .map((row) => row.item)
}

/** Упёрлись ли в потолок шаблонов — проверяется до вставки, не констрейнтом. */
export function isTemplatesFull(count: number, limit: number = TEMPLATES_LIMIT): boolean {
  return count >= limit
}

/** Тексты отказов — здесь же, рядом с правилом, а не в разметке экрана. */
export const STORAGE_MESSAGES = {
  historyFull: `Больше ${HISTORY_LIMIT} записей не храним — старые вытесняются`,
  templatesFull: `Больше ${TEMPLATES_LIMIT} шаблонов не храним — удалите ненужные`,
  nameTaken: 'Шаблон с таким названием уже есть',
} as const

/**
 * Учесть значения ссылки в справочнике.
 *
 * ⚠️ Это **побочный эффект сохранения ссылки**, а не отдельная ручка: в вебе
 * `trackValues` вызывается внутри `addHistory`, и в десктопе обязан вызываться
 * внутри той же транзакции. Реализация, которая просто пишет строку и не
 * трогает справочник, ничего не сломает и ничего не сообщит — справочник
 * останется пустым, а вместе с ним и детектор расщеплений, ради которого
 * делалась 3.0.
 *
 * Функция чистая: отдаёт новое состояние справочника. Кто и чем его запишет —
 * забота оболочки.
 */
export function trackValues(
  entries: readonly DictEntry[],
  params: UtmParams,
  now: string,
): DictEntry[] {
  const next = entries.map((entry) => ({ ...entry }))

  for (const kind of UTM_KEYS) {
    const value = (params[kind] ?? '').trim()
    if (!value) continue

    const existing = next.find((entry) => entry.kind === kind && entry.value === value)
    if (existing) {
      existing.uses += 1
      existing.lastUsedAt = now
    } else {
      next.push({ kind, value, uses: 1, firstSeenAt: now, lastUsedAt: now })
    }
  }

  return next
}

/** Совпадают ли имена шаблонов. Уникальность — регистронезависимая, как в БД. */
export function sameTemplateName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

/** Новая запись истории пойдёт первой: список всегда отдаётся свежим сверху. */
export function sortHistory<T extends { createdAt?: string }>(list: readonly T[]): T[] {
  return applyHistoryLimit(list, Number.POSITIVE_INFINITY)
}

export type { HistoryItem }
