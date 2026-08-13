/**
 * Пакетный режим: таблица площадок → 20 ссылок за заход (ASSISTANT-SPEC §2.5).
 *
 * CSV читаем и пишем по тем же правилам, что 2.2
 * (`legacy/desktop-2.2/frontend/js/utils.js`): запятая-разделитель, кавычки
 * удваиваются. Плюс понимаем русские заголовки — таблицы приходят из Excel,
 * где колонки называются «Источник» и «Канал», а не `utm_source`.
 */

import { buildUrl } from './build'
import { COLUMN_ALIASES, parseCsv, pickColumn, toCsv } from './csv'
import { validateDraft } from './validate'
import type { BatchResult, BatchRow, Issue, LinkDraft, UtmParams } from './types'
import { UTM_KEYS, UTM_PARAM_NAMES } from './types'

/** CSV или вставленная таблица → строки пакета. */
export function batchFromCsv(text: string): BatchRow[] {
  return parseCsv(text).map((row) => {
    const params: UtmParams = {}
    for (const key of UTM_KEYS) {
      const value = pickColumn(row, COLUMN_ALIASES[key])
      if (value) params[key] = value
    }
    /* Метку ищем и по синонимам названия: в таблицах из Excel колонка «Название»
       означает подпись строки, а не имя шаблона — своего имени у строки пакета
       нет и не должно быть. */
    const label = pickColumn(row, COLUMN_ALIASES.label) || pickColumn(row, COLUMN_ALIASES.name)
    const baseUrl = pickColumn(row, COLUMN_ALIASES.baseUrl)
    const batchRow: BatchRow = { params }
    if (label) batchRow.label = label
    if (baseUrl) batchRow.baseUrl = baseUrl
    return batchRow
  })
}

export interface BatchDefaults {
  /** Общий адрес для строк, где свой не указан. */
  baseUrl: string
  /** Значения, подставляемые в пустые поля каждой строки. */
  params?: UtmParams
}

/**
 * Собрать пакет. Каждая строка проверяется отдельно и своим списком замечаний:
 * одна кривая строка не должна прятать остальные девятнадцать.
 */
export function buildBatch(
  rows: readonly BatchRow[],
  defaults: BatchDefaults,
): BatchResult[] {
  return rows.map((row) => {
    const params: UtmParams = { ...(defaults.params ?? {}) }
    for (const key of UTM_KEYS) {
      const value = (row.params[key] ?? '').trim()
      if (value) params[key] = value
    }

    const draft: LinkDraft = {
      baseUrl: (row.baseUrl ?? '').trim() || defaults.baseUrl,
      params,
    }

    const result: BatchResult = {
      url: buildUrl(draft),
      issues: validateDraft(draft),
    }
    if (row.label) result.label = row.label
    return result
  })
}

/** Результаты пакета → CSV для выгрузки. */
export function batchToCsv(results: readonly BatchResult[]): string {
  return toCsv(
    results.map((result) => ({
      Метка: result.label ?? '',
      Ссылка: result.url,
      Замечания: result.issues
        .filter((issue) => issue.level !== 'info')
        .map((issue) => issue.message)
        .join('; '),
    })),
  )
}

/** Сводка по пакету — строка над таблицей. */
export function summarizeBatch(results: readonly BatchResult[]): {
  total: number
  withErrors: number
  withWarnings: number
} {
  const has = (issues: readonly Issue[], level: Issue['level']): boolean =>
    issues.some((issue) => issue.level === level)

  return {
    total: results.length,
    withErrors: results.filter((r) => has(r.issues, 'error')).length,
    withWarnings: results.filter((r) => has(r.issues, 'warning') && !has(r.issues, 'error')).length,
  }
}

/** Заголовки шаблона-образца для выгрузки пустой таблицы. */
export function batchTemplateCsv(): string {
  return toCsv([
    {
      Метка: 'ВК, пост в сообществе',
      Ссылка: '',
      Источник: 'vk',
      Канал: 'social',
      Кампания: 'osenniy_nabor',
      Содержание: 'post_1',
      'Ключевое слово': '',
    },
  ])
}

export { UTM_PARAM_NAMES }
