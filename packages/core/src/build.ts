/**
 * Сборка ссылки. Паритет с `UTMService.build_utm_url` из 2.2
 * (`legacy/desktop-2.2/src/core/services.py`):
 *
 * - URL без схемы получает `https://`;
 * - чужие параметры запроса сохраняются на своих местах;
 * - пустые UTM-значения игнорируются;
 * - уже присутствующий `utm_*` перезаписывается, новый — дописывается в конец;
 * - фрагмент (`#...`) сохраняется.
 *
 * Отличие от 2.2, сознательное: **плейсхолдеры площадок не кодируются**.
 * `utm_term={keyword}` обязан доехать до Директа буквально — процентная
 * кодировка `%7Bkeyword%7D` ломает подстановку, и это одна из самых дорогих
 * ошибок новичка (потерянная семантика за весь период).
 */

import { normalizeBaseUrl } from './normalize.js'
import type { LinkDraft, UtmParams } from './types.js'
import { UTM_KEYS, UTM_PARAM_NAMES } from './types.js'

export interface BuildOptions {
  /** Оставлять `{keyword}` некодированным. По умолчанию да. */
  keepPlaceholders?: boolean
}

/**
 * Кодирование значения для query. Пробел отдаём как `+` — так делает
 * `urlencode` в 2.2, и ссылки, собранные двумя версиями, совпадают байт в байт.
 */
function encodeValue(value: string, keepPlaceholders: boolean): string {
  const encoded = encodeURIComponent(value).replace(/%20/g, '+')
  if (!keepPlaceholders) return encoded
  return encoded.replace(/%7B/gi, '{').replace(/%7D/gi, '}')
}

/** Разобрать строку запроса в пары, сохранив порядок и дубли. */
function readPairs(search: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  const query = search.startsWith('?') ? search.slice(1) : search
  if (!query) return pairs
  for (const chunk of query.split('&')) {
    if (!chunk) continue
    const eq = chunk.indexOf('=')
    const rawName = eq === -1 ? chunk : chunk.slice(0, eq)
    const rawValue = eq === -1 ? '' : chunk.slice(eq + 1)
    pairs.push([safeDecode(rawName), safeDecode(rawValue)])
  }
  return pairs
}

/** `decodeURIComponent`, который не падает на битой кодировке (`%zz`). */
export function safeDecode(value: string): string {
  const plusToSpace = value.replace(/\+/g, ' ')
  try {
    return decodeURIComponent(plusToSpace)
  } catch {
    return plusToSpace
  }
}

/**
 * Собрать ссылку из черновика. Пустой или битый базовый URL возвращается
 * как есть — форма покажет замечание валидатора, а не пустоту.
 */
export function buildUrl(draft: LinkDraft, options: BuildOptions = {}): string {
  const keepPlaceholders = options.keepPlaceholders ?? true
  const base = normalizeBaseUrl(draft.baseUrl)
  if (!base) return ''

  let url: URL
  try {
    url = new URL(base)
  } catch {
    return draft.baseUrl
  }

  const pairs = readPairs(url.search)

  for (const key of UTM_KEYS) {
    const raw = draft.params[key]
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (!value) continue

    const name = UTM_PARAM_NAMES[key]
    const at = pairs.findIndex(([existing]) => existing === name)
    if (at === -1) {
      pairs.push([name, value])
    } else {
      pairs[at] = [name, value]
      // дубли того же параметра схлопываем: два utm_source — непредсказуемое
      // поведение на стороне аналитики
      for (let i = pairs.length - 1; i > at; i--) {
        if (pairs[i]?.[0] === name) pairs.splice(i, 1)
      }
    }
  }

  const query = pairs
    .map(([name, value]) =>
      value === ''
        ? encodeValue(name, keepPlaceholders)
        : `${encodeValue(name, keepPlaceholders)}=${encodeValue(value, keepPlaceholders)}`,
    )
    .join('&')

  const origin = `${url.protocol}//${url.host}${url.pathname}`
  return `${origin}${query ? `?${query}` : ''}${url.hash}`
}

/**
 * Базовый URL без параметров и фрагмента.
 * Паритет с `UTMService.extract_base_url`.
 */
export function extractBaseUrl(raw: string): string {
  const base = normalizeBaseUrl(raw)
  if (!base) return ''
  try {
    const url = new URL(base)
    return `${url.protocol}//${url.host}${url.pathname}`
  } catch {
    const cut = raw.indexOf('?')
    return cut === -1 ? raw : raw.slice(0, cut)
  }
}

/** Длина итоговой ссылки — нужна счётчику под полем результата. */
export function urlLength(draft: LinkDraft, options?: BuildOptions): number {
  return buildUrl(draft, options).length
}

/** Есть ли в черновике хоть одно заполненное UTM-поле. */
export function hasAnyParam(params: UtmParams): boolean {
  return UTM_KEYS.some((key) => (params[key] ?? '').trim() !== '')
}
