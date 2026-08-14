/**
 * Разбор чужой ссылки — экран «вставил URL, увидел, что не так».
 *
 * Задача шире, чем у `UTMService.parse_utm_params` из 2.2: там просто
 * доставались пять значений, здесь нужен полный расклад — что за параметры,
 * какие дублируются, что осталось от чужой разметки (`yclid`, `gclid`).
 */

import { safeDecode } from './build'
import { normalizeBaseUrl } from './normalize'
import type { UtmKey, UtmParams } from './types'
import { UTM_KEY_BY_PARAM } from './types'

export interface ParsedLink {
  /** Разобралось ли вообще. */
  valid: boolean
  /** Схема + хост + путь, без запроса и фрагмента. */
  baseUrl: string
  /** Найденные UTM-значения. */
  params: UtmParams
  /** Прочие параметры запроса в исходном порядке: `yclid`, `ref`, `page`. */
  extras: Array<{ name: string; value: string }>
  /** Имена параметров, встретившихся больше одного раза. */
  duplicates: string[]
  /** Фрагмент (`#anchor`), если был. */
  hash: string
}

const EMPTY: ParsedLink = {
  valid: false,
  baseUrl: '',
  params: {},
  extras: [],
  duplicates: [],
  hash: '',
}

/**
 * Разобрать ссылку. При дубле параметра берётся **первое** значение —
 * так же ведёт себя `parse_qs` в 2.2; сам факт дубля попадает в `duplicates`,
 * и валидатор поднимет его отдельным замечанием.
 */
export function parseUrl(raw: string): ParsedLink {
  const base = normalizeBaseUrl(raw)
  if (!base) return { ...EMPTY }

  let url: URL
  try {
    url = new URL(base)
  } catch {
    return { ...EMPTY }
  }

  if (!url.hostname.includes('.')) {
    return { ...EMPTY, baseUrl: `${url.protocol}//${url.host}${url.pathname}` }
  }

  const params: UtmParams = {}
  const extras: Array<{ name: string; value: string }> = []
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  const query = url.search.startsWith('?') ? url.search.slice(1) : url.search
  for (const chunk of query ? query.split('&') : []) {
    if (!chunk) continue
    const eq = chunk.indexOf('=')
    const name = safeDecode(eq === -1 ? chunk : chunk.slice(0, eq))
    const value = eq === -1 ? '' : safeDecode(chunk.slice(eq + 1))

    if (seen.has(name)) {
      duplicates.add(name)
      continue
    }
    seen.add(name)

    const utmKey: UtmKey | undefined = UTM_KEY_BY_PARAM[name]
    if (utmKey) {
      params[utmKey] = value
    } else {
      extras.push({ name, value })
    }
  }

  return {
    valid: true,
    baseUrl: `${url.protocol}//${url.host}${url.pathname}`,
    params,
    extras,
    duplicates: [...duplicates],
    hash: url.hash,
  }
}

/** Есть ли в ссылке хоть какая-то UTM-разметка. */
export function hasUtm(raw: string): boolean {
  const parsed = parseUrl(raw)
  return Object.keys(parsed.params).length > 0
}

/**
 * Метки, потерявшиеся между двумя ссылками. Нужно проверке редиректов:
 * какие параметры не дожили до конечной страницы.
 */
export function lostParams(before: string, after: string): UtmKey[] {
  const from = parseUrl(before).params
  const to = parseUrl(after).params
  return (Object.keys(from) as UtmKey[]).filter((key) => from[key] !== to[key])
}
