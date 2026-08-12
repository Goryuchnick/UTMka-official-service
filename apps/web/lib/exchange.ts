'use client'

import { UTM_KEYS, type HistoryItem, type Template } from '@utmka/core'

/**
 * Импорт и выгрузка — JSON и CSV, обе стороны. Паритет с 2.2, где это было
 * единственным способом унести данные с одного компьютера на другой.
 *
 * Формат JSON намеренно простой и плоский: файлы 2.2 читаются как есть,
 * а новые открываются в любой таблице после переименования в .csv.
 */

function download(name: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function exportJson(name: string, payload: unknown): void {
  download(`${name}.json`, 'application/json', JSON.stringify(payload, null, 2))
}

export function exportCsv(name: string, rows: string[][]): void {
  const escape = (cell: string): string =>
    /[",;\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
  // Разделитель — точка с запятой: Excel с русской локалью иначе кладёт
  // всю строку в одну ячейку. BOM — чтобы он же не съел кириллицу.
  const text = `﻿${rows.map((row) => row.map(escape).join(';')).join('\r\n')}`
  download(`${name}.csv`, 'text/csv', text)
}

/* ─────────────────────────── история ─────────────────────────── */

export function historyToJson(items: HistoryItem[]): unknown {
  return {
    kind: 'utmka.history',
    version: 1,
    items: items.map((item) => ({
      url: item.url,
      baseUrl: item.baseUrl,
      params: item.params,
      shortUrl: item.shortUrl,
      origin: item.origin,
      createdAt: item.createdAt,
    })),
  }
}

export function historyToCsv(items: HistoryItem[]): string[][] {
  const head = ['url', 'base_url', ...UTM_KEYS.map((key) => `utm_${key}`), 'short_url', 'created_at']
  const rows = items.map((item) => [
    item.url,
    item.baseUrl ?? '',
    ...UTM_KEYS.map((key) => item.params?.[key] ?? ''),
    item.shortUrl ?? '',
    item.createdAt ?? '',
  ])
  return [head, ...rows]
}

/* ─────────────────────────── шаблоны ─────────────────────────── */

export function templatesToJson(items: Template[]): unknown {
  return {
    kind: 'utmka.templates',
    version: 1,
    items: items.map((item) => ({
      name: item.name,
      baseUrl: item.baseUrl,
      params: item.params,
      tagName: item.tagName,
      tagColor: item.tagColor,
      presetId: item.presetId,
    })),
  }
}

export function templatesToCsv(items: Template[]): string[][] {
  const head = ['name', 'base_url', ...UTM_KEYS.map((key) => `utm_${key}`), 'tag']
  const rows = items.map((item) => [
    item.name,
    item.baseUrl ?? '',
    ...UTM_KEYS.map((key) => item.params?.[key] ?? ''),
    item.tagName ?? '',
  ])
  return [head, ...rows]
}

/** CSV → массив словарей по заголовку. Разделитель определяем по первой строке. */
function parseCsvRows(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','

  const split = (line: string): string[] => {
    const cells: string[] = []
    let cell = ''
    let quoted = false
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]
      if (quoted) {
        if (char === '"' && line[i + 1] === '"') {
          cell += '"'
          i += 1
        } else if (char === '"') quoted = false
        else cell += char
      } else if (char === '"') quoted = true
      else if (char === delimiter) {
        cells.push(cell)
        cell = ''
      } else cell += char
    }
    cells.push(cell)
    return cells.map((value) => value.trim())
  }

  const head = split(lines[0]).map((cell) => cell.toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = split(line)
    const row: Record<string, string> = {}
    head.forEach((name, index) => {
      if (cells[index]) row[name] = cells[index]
    })
    // Синонимы, чтобы вызывающему не разбирать заголовки заново.
    if (!row.baseurl && row.base_url) row.baseUrl = row.base_url
    if (row.base_url) row.baseUrl = row.base_url
    return row
  })
}

/** Что удалось вычитать из файла. Кривые строки пропускаем, а не роняем импорт. */
export interface ImportedTemplate {
  name: string
  baseUrl: string
  params: Record<string, string>
  tagName?: string
  tagColor?: string
}

/** Разбор JSON: формат 3.0 и плоский массив из 2.2. */
export function parseTemplatesJson(text: string): ImportedTemplate[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }

  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { items?: unknown }).items)
      ? ((parsed as { items: unknown[] }).items)
      : []

  const result: ImportedTemplate[] = []
  for (const raw of list) {
    if (typeof raw !== 'object' || raw === null) continue
    const row = raw as Record<string, unknown>
    const name = String(row.name ?? row.title ?? '').trim()
    if (!name) continue

    const source = (row.params ?? row) as Record<string, unknown>
    const params: Record<string, string> = {}
    for (const key of UTM_KEYS) {
      const value = source[key] ?? source[`utm_${key}`]
      if (typeof value === 'string' && value.trim()) params[key] = value.trim()
    }

    result.push({
      name,
      baseUrl: String(row.baseUrl ?? row.base_url ?? row.url ?? '').trim(),
      params,
      tagName: typeof row.tagName === 'string' ? row.tagName : typeof row.tag === 'string' ? row.tag : undefined,
      tagColor: typeof row.tagColor === 'string' ? row.tagColor : undefined,
    })
  }
  return result
}

/** Разбор CSV: разделитель определяем по первой строке, кавычки понимаем. */
export function parseTemplatesCsv(text: string): ImportedTemplate[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','

  const split = (line: string): string[] => {
    const cells: string[] = []
    let cell = ''
    let quoted = false
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]
      if (quoted) {
        if (char === '"' && line[i + 1] === '"') {
          cell += '"'
          i += 1
        } else if (char === '"') quoted = false
        else cell += char
      } else if (char === '"') quoted = true
      else if (char === delimiter) {
        cells.push(cell)
        cell = ''
      } else cell += char
    }
    cells.push(cell)
    return cells.map((value) => value.trim())
  }

  const head = split(lines[0]).map((cell) => cell.toLowerCase())
  const at = (row: string[], ...names: string[]): string => {
    for (const name of names) {
      const index = head.indexOf(name)
      if (index >= 0 && row[index]) return row[index]
    }
    return ''
  }

  const result: ImportedTemplate[] = []
  for (const line of lines.slice(1)) {
    const row = split(line)
    const name = at(row, 'name', 'название', 'title')
    if (!name) continue

    const params: Record<string, string> = {}
    for (const key of UTM_KEYS) {
      const value = at(row, `utm_${key}`, key)
      if (value) params[key] = value
    }

    result.push({
      name,
      baseUrl: at(row, 'base_url', 'url', 'адрес'),
      params,
      tagName: at(row, 'tag', 'тег') || undefined,
    })
  }
  return result
}

/** Запись истории из файла. Формат тот же, что у выгрузки выше. */
export interface ImportedLink {
  url: string
  baseUrl: string
  params: Record<string, string>
  origin: 'single' | 'batch' | 'brief' | 'parse'
}

/**
 * Разбор истории. Через шаблонный разбор идти нельзя: тот требует имя, а у
 * записи истории его нет и не должно быть — она опознаётся по адресу.
 */
export function parseHistory(text: string, csv: boolean): ImportedLink[] {
  const result: ImportedLink[] = []

  const take = (row: Record<string, unknown>, source: Record<string, unknown>): void => {
    const url = String(row.url ?? row.baseUrl ?? row.base_url ?? '').trim()
    if (!url) return

    const params: Record<string, string> = {}
    for (const key of UTM_KEYS) {
      const value = source[key] ?? source[`utm_${key}`]
      if (typeof value === 'string' && value.trim()) params[key] = value.trim()
    }

    result.push({
      url,
      baseUrl: String(row.baseUrl ?? row.base_url ?? url).trim(),
      params,
      // Откуда ссылка взялась в прошлой жизни, файл знать не обязан.
      origin: 'single',
    })
  }

  if (csv) {
    const rows = parseCsvRows(text)
    for (const row of rows) take(row, row)
    return result
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }

  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : []

  for (const raw of list) {
    if (typeof raw !== 'object' || raw === null) continue
    const row = raw as Record<string, unknown>
    const source = (row.params ?? row) as Record<string, unknown>
    take(row, source)
  }

  return result
}
