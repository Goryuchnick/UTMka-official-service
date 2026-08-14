/**
 * Форматы обмена: JSON и CSV, обе стороны.
 *
 * Паритет с 2.2, где файл был единственным способом унести данные с одного
 * компьютера на другой. Формат намеренно простой и плоский: файлы 2.2 читаются
 * как есть, а наши открываются в любой таблице.
 *
 * Здесь только преобразования — ни DOM, ни сети. Класть файл на диск умеет
 * оболочка (`saveFile`): в браузере это `<a download>`, в окне Tauri системный
 * диалог. Разбор CSV — общий на весь проект (`csv.ts`).
 */

import { COLUMN_ALIASES, parseCsv, pickColumn } from './csv'
import type { HistoryItem, Template } from './repository'
import { UTM_KEYS } from './types'

/* ─────────────────────────── история ─────────────────────────── */

export function historyToJson(items: readonly HistoryItem[]): unknown {
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

export function historyToCsv(items: readonly HistoryItem[]): string[][] {
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

export function templatesToJson(items: readonly Template[]): unknown {
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

export function templatesToCsv(items: readonly Template[]): string[][] {
  const head = ['name', 'base_url', ...UTM_KEYS.map((key) => `utm_${key}`), 'tag']
  const rows = items.map((item) => [
    item.name,
    item.baseUrl ?? '',
    ...UTM_KEYS.map((key) => item.params?.[key] ?? ''),
    item.tagName ?? '',
  ])
  return [head, ...rows]
}

/* ─────────────────────────── разбор файлов ─────────────────────────── */

/** Что удалось вычитать из файла. Кривые строки пропускаем, а не роняем импорт. */
export interface ImportedTemplate {
  name: string
  baseUrl: string
  params: Record<string, string>
  tagName?: string
  tagColor?: string
}

/** Запись истории из файла. Формат тот же, что у выгрузки выше. */
export interface ImportedLink {
  url: string
  baseUrl: string
  params: Record<string, string>
  origin: 'single' | 'batch' | 'brief' | 'parse'
}

/** Значения UTM из произвольного объекта: и `source`, и `utm_source`. */
function paramsFrom(source: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {}
  for (const key of UTM_KEYS) {
    const value = source[key] ?? source[`utm_${key}`]
    if (typeof value === 'string' && value.trim()) params[key] = value.trim()
  }
  return params
}

/** Массив записей из JSON: и голый массив, и объект с полем `items`. */
function listFromJson(text: string): Record<string, unknown>[] {
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

  return list.filter(
    (raw): raw is Record<string, unknown> => typeof raw === 'object' && raw !== null,
  )
}

/** Разбор JSON: формат 3.0 и плоский массив из 2.2 (с префиксами `utm_`). */
export function parseTemplatesJson(text: string): ImportedTemplate[] {
  const result: ImportedTemplate[] = []

  for (const row of listFromJson(text)) {
    const name = String(row.name ?? row.title ?? '').trim()
    if (!name) continue

    result.push({
      name,
      baseUrl: String(row.baseUrl ?? row.base_url ?? row.url ?? '').trim(),
      params: paramsFrom((row.params ?? row) as Record<string, unknown>),
      tagName:
        typeof row.tagName === 'string'
          ? row.tagName
          : typeof row.tag === 'string'
            ? row.tag
            : undefined,
      tagColor: typeof row.tagColor === 'string' ? row.tagColor : undefined,
    })
  }

  return result
}

/** Разбор CSV шаблонов. Разделитель и кавычки — забота общего парсера. */
export function parseTemplatesCsv(text: string): ImportedTemplate[] {
  const result: ImportedTemplate[] = []

  for (const row of parseCsv(text)) {
    const name = pickColumn(row, COLUMN_ALIASES.name)
    if (!name) continue

    const params: Record<string, string> = {}
    for (const key of UTM_KEYS) {
      const value = pickColumn(row, COLUMN_ALIASES[key])
      if (value) params[key] = value
    }

    result.push({
      name,
      baseUrl: pickColumn(row, COLUMN_ALIASES.baseUrl),
      params,
      tagName: pickColumn(row, ['tag', 'тег', 'метка']) || undefined,
    })
  }

  return result
}

/**
 * Разбор истории. Через шаблонный разбор идти нельзя: тот требует имя, а у
 * записи истории его нет и не должно быть — она опознаётся по адресу.
 */
export function parseHistory(text: string, csv: boolean): ImportedLink[] {
  const take = (
    row: Record<string, unknown>,
    source: Record<string, unknown>,
    result: ImportedLink[],
  ): void => {
    const url = String(row.url ?? row.baseUrl ?? row.base_url ?? '').trim()
    if (!url) return

    result.push({
      url,
      baseUrl: String(row.baseUrl ?? row.base_url ?? url).trim(),
      params: paramsFrom(source),
      // Откуда ссылка взялась в прошлой жизни, файл знать не обязан.
      origin: 'single',
    })
  }

  const result: ImportedLink[] = []

  if (csv) {
    for (const row of parseCsv(text)) take(row, row, result)
    return result
  }

  for (const row of listFromJson(text)) {
    take(row, (row.params ?? row) as Record<string, unknown>, result)
  }
  return result
}

/* ─────────────────────────── образец файла ─────────────────────────── */

/**
 * Пара строк-примеров для импорта — паритет с 2.2 («Скачать пример JSON / CSV»).
 *
 * Импорт принимает и свой формат, и плоский из 2.2, но узнать об этом можно
 * было только из исходников: человек с чужой таблицей на сотню строк должен
 * видеть, какие колонки нужны, до того как импорт скажет «в файле не нашлось
 * ни одного шаблона».
 *
 * Образец намеренно осмысленный, а не `foo`/`bar`: его чаще всего открывают в
 * Excel, стирают строки и вписывают свои — значит он заодно показывает,
 * как выглядят правильные значения меток.
 */
export const TEMPLATE_SAMPLE: readonly Template[] = [
  {
    id: 'sample-1',
    name: 'Осенний набор — Директ',
    baseUrl: 'https://test.ru/autumn',
    params: {
      source: 'yandex',
      medium: 'cpc',
      campaign: 'osenniy_nabor',
      content: 'banner_1',
      term: '{keyword}',
    },
    tagName: 'Осень',
  },
  {
    id: 'sample-2',
    name: 'Рассылка по базе',
    baseUrl: 'https://test.ru/autumn',
    params: {
      source: 'email',
      medium: 'email',
      campaign: 'osenniy_nabor',
      content: 'letter_1',
    },
    tagName: 'Осень',
  },
]

/** Образец в том же виде, в каком выгружается библиотека. */
export function templatesSampleJson(): unknown {
  return templatesToJson(TEMPLATE_SAMPLE)
}

export function templatesSampleCsv(): string[][] {
  return templatesToCsv(TEMPLATE_SAMPLE)
}
