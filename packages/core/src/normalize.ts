/**
 * Нормализация значений — «привести в порядок» одним нажатием.
 *
 * Правило из ASSISTANT-SPEC §2.2: показываем «до / после», а не переписываем
 * молча. Поэтому все функции возвращают и результат, и список изменений.
 */

import type { IssueField, LinkDraft, NormalizationChange, UtmKey, UtmParams } from './types'
import { UTM_KEYS } from './types'

/**
 * Транслитерация кириллицы. Таблица — практическая, а не ГОСТ: цель в том,
 * чтобы значение осталось узнаваемым в отчёте Метрики, а не в паспорте.
 * `ъ` и `ь` выпадают: `подъезд` → `podezd`, а не `pod_ezd`.
 */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
}

/** Есть ли в строке кириллица. */
export function hasCyrillic(value: string): boolean {
  return /[а-яё]/i.test(value)
}

/** Транслитерация без прочих правок. */
export function transliterate(value: string): string {
  return value
    .split('')
    .map((char) => {
      const lower = char.toLowerCase()
      const mapped = TRANSLIT[lower]
      if (mapped === undefined) return char
      // Заглавную кириллицу отдаём заглавной латиницей: регистр чинится ниже,
      // отдельным правилом, и мы не хотим прятать его от пользователя здесь.
      return char === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1)
    })
    .join('')
}

/**
 * Плейсхолдеры площадок (`{keyword}`, `{campaign_id}`) — не мусор, а часть
 * значения. Нормализация обязана оставить их нетронутыми, включая регистр
 * и фигурные скобки: Яндекс.Директ подставит значение только в точное
 * написание токена.
 */
const PLACEHOLDER_RE = /\{[a-z_0-9]+\}/gi

/** Заменить плейсхолдеры на защитные маркеры и вернуть их обратно после правок. */
function protectPlaceholders(value: string): { masked: string; restore: (s: string) => string } {
  const found: string[] = []
  const masked = value.replace(PLACEHOLDER_RE, (match) => {
    found.push(match)
    // Маркер без спецсимволов и кириллицы — переживёт любые правила ниже.
    return `zzplaceholderzz${found.length - 1}zz`
  })
  const restore = (s: string): string =>
    s.replace(/zzplaceholderzz(\d+)zz/gi, (_, index: string) => found[Number(index)] ?? '')
  return { masked, restore }
}

/**
 * Нормализация одного значения:
 * нижний регистр → транслит кириллицы → пробелы и разделители в `_` →
 * выброс спецсимволов → схлопывание и обрезка `_`.
 *
 * Плейсхолдеры площадок сохраняются как есть.
 */
export function normalizeValue(raw: string): string {
  const { masked, restore } = protectPlaceholders(raw.trim())

  const normalized = masked
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    // пробелы, плюсы, точки-разделители и дефисы → подчёркивание
    .replace(/[\s+.\-–—]+/g, '_')
    // всё, что не латиница, цифры и `_`, — выкидываем: `&`, `?`, `#`, `%`
    // рвут разбор параметров
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')

  return restore(normalized)
}

/** Нужна ли этому значению нормализация. */
export function needsNormalization(raw: string): boolean {
  return raw !== normalizeValue(raw)
}

/**
 * Нормализация базового URL: схема, обрезка пробелов. Путь, домен и чужие
 * параметры не трогаем — там кириллица и регистр законны (IDN, чувствительные
 * к регистру пути).
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // `//example.com` и `example.com` одинаково приводим к https
  return `https://${trimmed.replace(/^\/+/, '')}`
}

/** Результат нормализации черновика: что получилось и что именно поменялось. */
export interface NormalizeResult {
  draft: LinkDraft
  changes: NormalizationChange[]
}

/** Нормализовать весь черновик, вернув список изменений для показа «до / после». */
export function normalizeDraft(draft: LinkDraft): NormalizeResult {
  const changes: NormalizationChange[] = []

  const baseUrl = normalizeBaseUrl(draft.baseUrl)
  if (baseUrl !== draft.baseUrl) {
    changes.push({ field: 'baseUrl', before: draft.baseUrl, after: baseUrl })
  }

  const params: UtmParams = {}
  for (const key of UTM_KEYS) {
    const before = draft.params[key]
    if (before === undefined) continue
    const after = normalizeValue(before)
    if (after) params[key] = after
    if (after !== before) {
      changes.push({ field: key as IssueField, before, after })
    }
  }

  return { draft: { baseUrl, params }, changes }
}

/** Нормализовать отдельные значения справочника (для сведения алиасов). */
export function normalizeEntries(values: readonly string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const value of values) map.set(value, normalizeValue(value))
  return map
}

export type { UtmKey }
