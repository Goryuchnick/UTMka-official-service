/**
 * Пакетный режим: таблица площадок → 20 ссылок за заход (ASSISTANT-SPEC §2.5).
 *
 * CSV читаем и пишем по тем же правилам, что 2.2
 * (`legacy/desktop-2.2/frontend/js/utils.js`): запятая-разделитель, кавычки
 * удваиваются. Плюс понимаем русские заголовки — таблицы приходят из Excel,
 * где колонки называются «Источник» и «Канал», а не `utm_source`.
 */

import { buildUrl } from './build.js'
import { validateDraft } from './validate.js'
import type { BatchResult, BatchRow, Issue, LinkDraft, UtmKey, UtmParams } from './types.js'
import { UTM_KEYS, UTM_PARAM_NAMES } from './types.js'

/** Заголовки, которые принимаем на импорте. Ключ — поле, значения — синонимы. */
const COLUMN_ALIASES: Record<UtmKey | 'label' | 'baseUrl', readonly string[]> = {
  label: ['label', 'метка', 'название', 'площадка', 'name'],
  baseUrl: ['url', 'ссылка', 'адрес', 'base_url', 'baseurl', 'страница'],
  source: ['utm_source', 'source', 'источник'],
  medium: ['utm_medium', 'medium', 'канал', 'тип трафика'],
  campaign: ['utm_campaign', 'campaign', 'кампания'],
  content: ['utm_content', 'content', 'содержание', 'объявление'],
  term: ['utm_term', 'term', 'ключевое слово', 'ключ', 'фраза'],
}

/** Экранирование значения CSV. Паритет с `escapeCSVValue` из 2.2. */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (text.includes(',') || text.includes('\n') || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/** Разбор одной строки CSV с учётом кавычек. Паритет с `parseCSVLine` из 2.2. */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char ?? ''
    }
  }

  result.push(current)
  return result
}

/** CSV → массив объектов по заголовкам первой строки. */
export function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0] ?? '').map((h) => h.trim())
  const rows: Array<Record<string, string>> = []

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim()
    })
    rows.push(row)
  }

  return rows
}

/** Массив объектов → CSV. Колонки берутся из первой строки. */
export function toCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0] ?? {})
  const head = headers.map(escapeCsvValue).join(',')
  const body = rows.map((row) => headers.map((h) => escapeCsvValue(row[h] ?? '')).join(','))
  return [head, ...body].join('\n')
}

/** Найти колонку по списку синонимов (регистр и пробелы не важны). */
function pickColumn(row: Record<string, string>, aliases: readonly string[]): string {
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.trim().toLowerCase()
    if (aliases.includes(normalized)) return value
  }
  return ''
}

/** CSV или вставленная таблица → строки пакета. */
export function batchFromCsv(text: string): BatchRow[] {
  return parseCsv(text).map((row) => {
    const params: UtmParams = {}
    for (const key of UTM_KEYS) {
      const value = pickColumn(row, COLUMN_ALIASES[key])
      if (value) params[key] = value
    }
    const label = pickColumn(row, COLUMN_ALIASES.label)
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
