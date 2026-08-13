/**
 * CSV — один разбор на весь проект.
 *
 * До этого таблицы читались двумя независимыми парсерами: `batch.ts` держал
 * разделителем жёсткую запятую и богатый список синонимов заголовков, а
 * `exchange.ts` определял разделитель по первой строке, но синонимов знал
 * меньше — и внутри одного файла дважды повторял двадцатистрочный разбор
 * кавычек. Один и тот же файл мог разобраться по-разному в пакетном режиме и
 * в импорте шаблонов; расхождение было возможно ещё до всякого десктопа.
 *
 * Правила разбора — паритет с 2.2 (`legacy/desktop-2.2/frontend/js/utils.js`):
 * кавычки удваиваются, перенос строки внутри кавычек допустим.
 */

import type { UtmKey } from './types'

/** Заголовки, которые принимаем на импорте. Ключ — поле, значения — синонимы. */
export const COLUMN_ALIASES: Record<UtmKey | 'label' | 'baseUrl' | 'name', readonly string[]> = {
  label: ['label', 'метка', 'площадка'],
  name: ['name', 'название', 'title', 'имя'],
  baseUrl: ['url', 'ссылка', 'адрес', 'base_url', 'baseurl', 'страница'],
  source: ['utm_source', 'source', 'источник'],
  medium: ['utm_medium', 'medium', 'канал', 'тип трафика'],
  campaign: ['utm_campaign', 'campaign', 'кампания'],
  content: ['utm_content', 'content', 'содержание', 'объявление'],
  term: ['utm_term', 'term', 'ключевое слово', 'ключ', 'фраза'],
}

/**
 * Разделитель определяем по первой строке.
 *
 * Excel с русской локалью выгружает через точку с запятой, английский — через
 * запятую, и оба файла пользователь считает «обычным CSV». Жёсткая запятая
 * складывала русскую выгрузку в одну колонку.
 */
export function detectDelimiter(headerLine: string): ';' | ',' {
  const semicolons = (headerLine.match(/;/g) ?? []).length
  const commas = (headerLine.match(/,/g) ?? []).length
  return semicolons >= commas && semicolons > 0 ? ';' : ','
}

/** Разбор одной строки с учётом кавычек. Паритет с `parseCSVLine` из 2.2. */
export function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      cells.push(cell)
      cell = ''
    } else {
      cell += char ?? ''
    }
  }

  cells.push(cell)
  return cells
}

/**
 * CSV → массив объектов по заголовкам первой строки.
 *
 * Заголовки сохраняются как есть: разбор не должен искажать данные, иначе
 * выгрузка и чтение обратно перестают совпадать. Регистр и синонимы —
 * забота `pickColumn`.
 */
export function parseCsv(text: string): Array<Record<string, string>> {
  // BOM обязателен в наших же выгрузках (иначе Excel съедает кириллицу) —
  // и он же попадёт обратно на импорте первым символом заголовка.
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
  if (lines.length < 2) return []

  const delimiter = detectDelimiter(lines[0] ?? '')
  const headers = parseCsvLine(lines[0] ?? '', delimiter).map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim()
    })
    return row
  })
}

/**
 * Найти колонку по списку синонимов: регистр и краевые пробелы не важны.
 *
 * Порядок перебора — по синонимам, а не по колонкам файла: если в таблице есть
 * и `utm_source`, и `Источник`, выигрывает первый синоним списка, а не тот,
 * что оказался левее в файле.
 */
export function pickColumn(row: Record<string, string>, aliases: readonly string[]): string {
  const normalized = new Map<string, string>()
  for (const [key, value] of Object.entries(row)) {
    const name = key.trim().toLowerCase()
    if (value && !normalized.has(name)) normalized.set(name, value)
  }

  for (const alias of aliases) {
    const value = normalized.get(alias)
    if (value) return value
  }
  return ''
}

/** Экранирование значения. Экранируем оба разделителя — файл читают обеими. */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Массив объектов → CSV. Колонки берутся из первой строки. */
export function toCsv(
  rows: ReadonlyArray<Record<string, unknown>>,
  delimiter: ';' | ',' = ',',
): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0] ?? {})
  const head = headers.map(escapeCsvValue).join(delimiter)
  const body = rows.map((row) => headers.map((h) => escapeCsvValue(row[h] ?? '')).join(delimiter))
  return [head, ...body].join('\n')
}

/** Матрица строк → CSV. Для выгрузок, где колонки заданы заголовком-массивом. */
export function rowsToCsv(rows: ReadonlyArray<readonly string[]>, delimiter: ';' | ',' = ';'): string {
  return rows.map((row) => row.map(escapeCsvValue).join(delimiter)).join('\r\n')
}
