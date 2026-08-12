/**
 * Проверка редиректов (ASSISTANT-SPEC §2.7): пройти цепочку переадресаций
 * и показать, дожили ли метки до конечной страницы.
 *
 * Здесь — только логика и предохранители. Саму сеть инжектит вызывающий:
 * в вебе это серверный роут, в десктопе — команда Tauri. Ядро `fetch` не знает.
 *
 * ⚠️ Это SSRF-вектор: сервер ходит по адресу, который дал пользователь.
 * Поэтому `assertPublicUrl` проверяется **на каждом хопе**, а не только на первом
 * (ARCHITECTURE §4.4).
 */

import { parseUrl } from './parse'
import type { UtmKey } from './types'

/** Ответ на один запрос: код и заголовок Location, если он был. */
export interface HopResponse {
  status: number
  location?: string
}

/** Инъекция сети: делает один запрос БЕЗ автоматического следования редиректам. */
export type HopFetcher = (url: string) => Promise<HopResponse>

export interface RedirectOptions {
  /** Потолок переходов. Больше — почти наверняка петля. */
  maxHops?: number
}

export interface Hop {
  url: string
  status: number
}

export type RedirectFailure =
  | 'blocked-scheme'
  | 'blocked-private-host'
  | 'too-many-hops'
  | 'network-error'
  | 'invalid-url'

export interface RedirectReport {
  hops: Hop[]
  finalUrl: string
  /** Метки, не дожившие до конечного адреса. */
  lost: UtmKey[]
  /** Заполнено, если проверка прервалась. */
  failure?: RedirectFailure
  failureUrl?: string
}

const DEFAULT_MAX_HOPS = 10

/**
 * Приводит любую запись IPv4 к точечной. Браузер и `fetch` понимают формы,
 * которых не ждёт наивный фильтр: `http://2130706433/`, `http://0177.0.0.1/`
 * и `http://0x7f.1/` — это всё 127.0.0.1. Проверка «четыре числа через точку»
 * их не ловит и пропускает запрос внутрь сети.
 *
 * Правила те же, что у `inet_aton`: ведущий `0x` — шестнадцатеричное,
 * ведущий `0` — восьмеричное, последняя часть добирает оставшиеся байты.
 * Возвращает `null`, если это не запись адреса вовсе (обычный домен).
 */
function toDottedIpv4(host: string): string | null {
  const parts = host.split('.')
  if (parts.length > 4) return null

  const numbers: number[] = []
  for (const part of parts) {
    if (!part) return null

    let value: number
    if (/^0[xX][0-9a-fA-F]+$/.test(part)) value = Number.parseInt(part.slice(2), 16)
    else if (/^0[0-7]+$/.test(part)) value = Number.parseInt(part.slice(1), 8)
    else if (/^\d+$/.test(part)) value = Number.parseInt(part, 10)
    else return null

    if (!Number.isFinite(value) || value < 0) return null
    numbers.push(value)
  }

  // Последняя часть занимает все оставшиеся байты: у `127.1` это `0.0.1`.
  const last = numbers[numbers.length - 1] ?? 0
  const head = numbers.slice(0, -1)
  if (head.some((n) => n > 255)) return null
  if (last >= 2 ** (8 * (4 - head.length))) return null

  const bytes = [...head]
  for (let i = 4 - head.length - 1; i >= 0; i -= 1) {
    bytes.push((last >>> (8 * i)) & 0xff)
  }
  return bytes.join('.')
}

/**
 * Приватные и служебные диапазоны. Проверяем строковые литералы: DNS-резолв
 * ядру недоступен, его обязан делать вызывающий (`isPublicHost` для каждого
 * полученного адреса), иначе домен, указывающий на 127.0.0.1, пройдёт фильтр.
 */
function isPrivateHostname(hostname: string): boolean {
  let host = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true
  // IPv6 unique-local (fc00::/7) и link-local (fe80::/10)
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true
  // внутренние зоны
  if (/\.(local|internal|lan|home|corp)$/.test(host)) return true

  /* IPv4-mapped IPv6 (`::ffff:127.0.0.1`) — тот же адрес другими словами.
     Разворачиваем и проверяем как обычный IPv4. */
  const mapped = host.match(/^::ffff:(.+)$/)
  if (mapped?.[1]) {
    const inner = mapped[1]
    // Может быть и в hex-виде (`::ffff:7f00:1`) — такие не пускаем вовсе.
    if (!inner.includes('.')) return true
    host = inner
  }

  const dotted = toDottedIpv4(host)
  if (!dotted) {
    /* Числовая запись, которую не удалось разобрать (`999.1.1.1`), — это битый
       адрес, а не домен: числовым TLD не бывает. Такое не пускаем. */
    return /^(0[xX][0-9a-fA-F]+|\d+)(\.(0[xX][0-9a-fA-F]+|\d+))*$/.test(host)
  }

  const octets = dotted.split('.').map(Number)
  const [a = 0, b = 0] = octets

  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true // link-local, оттуда же метаданные облака
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a >= 224) return true // multicast и зарезервированное

  return false
}

/**
 * Публичный ли адрес, полученный резолвом имени.
 *
 * Отдельная точка входа для сетевого слоя: `assertPublicUrl` видит только имя
 * домена, а `evil.example.com` спокойно указывает на `127.0.0.1`. Вызывающий
 * обязан резолвить хост и прогнать **каждый** полученный адрес через эту
 * проверку перед запросом — на каждом хопе, а не только на первом.
 */
export function isPublicHost(hostname: string): boolean {
  return !isPrivateHostname(hostname)
}

/** Можно ли выпускать сервер по этому адресу. */
export function assertPublicUrl(raw: string): { ok: true } | { ok: false; reason: RedirectFailure } {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: 'invalid-url' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'blocked-scheme' }
  }
  if (isPrivateHostname(url.hostname)) {
    return { ok: false, reason: 'blocked-private-host' }
  }
  return { ok: true }
}

/**
 * Пройти цепочку переадресаций и сравнить метки на входе и на выходе.
 *
 * Возвращает отчёт даже при обрыве: пользователю полезно видеть, на каком
 * шаге всё сломалось.
 */
export async function followRedirects(
  startUrl: string,
  fetcher: HopFetcher,
  options: RedirectOptions = {},
): Promise<RedirectReport> {
  const maxHops = options.maxHops ?? DEFAULT_MAX_HOPS
  const hops: Hop[] = []
  let current = startUrl

  const guard = assertPublicUrl(current)
  if (!guard.ok) {
    return { hops, finalUrl: current, lost: [], failure: guard.reason, failureUrl: current }
  }

  for (let step = 0; step <= maxHops; step++) {
    if (step === maxHops) {
      return {
        hops,
        finalUrl: current,
        lost: compareParams(startUrl, current),
        failure: 'too-many-hops',
        failureUrl: current,
      }
    }

    let response: HopResponse
    try {
      response = await fetcher(current)
    } catch {
      return {
        hops,
        finalUrl: current,
        lost: compareParams(startUrl, current),
        failure: 'network-error',
        failureUrl: current,
      }
    }

    hops.push({ url: current, status: response.status })

    const isRedirect = response.status >= 300 && response.status < 400 && response.location
    if (!isRedirect) break

    const next = resolveLocation(current, response.location ?? '')
    if (!next) {
      return {
        hops,
        finalUrl: current,
        lost: compareParams(startUrl, current),
        failure: 'invalid-url',
        failureUrl: response.location ?? '',
      }
    }

    const nextGuard = assertPublicUrl(next)
    if (!nextGuard.ok) {
      return {
        hops,
        finalUrl: current,
        lost: compareParams(startUrl, current),
        failure: nextGuard.reason,
        failureUrl: next,
      }
    }

    current = next
  }

  return { hops, finalUrl: current, lost: compareParams(startUrl, current) }
}

/** Относительный Location превращаем в абсолютный. */
function resolveLocation(base: string, location: string): string | null {
  try {
    return new URL(location, base).toString()
  } catch {
    return null
  }
}

/**
 * Какие метки не доехали. Считаем потерянной и ту, что изменила значение:
 * подмена `utm_source` посредником — такая же дыра в отчёте, как пропажа.
 */
function compareParams(before: string, after: string): UtmKey[] {
  const from = parseUrl(before).params
  const to = parseUrl(after).params
  return (Object.keys(from) as UtmKey[]).filter((key) => from[key] !== to[key])
}

/** Человеческое объяснение обрыва — для интерфейса и маскота. */
export function explainFailure(failure: RedirectFailure): string {
  switch (failure) {
    case 'blocked-scheme':
      return 'Проверяем только http и https — по другим схемам сервер не ходит.'
    case 'blocked-private-host':
      return 'Адрес ведёт внутрь сети, а не в интернет. Такие проверки мы не выполняем.'
    case 'too-many-hops':
      return 'Слишком длинная цепочка переадресаций — похоже на петлю. Метки в такой цепочке почти наверняка теряются.'
    case 'network-error':
      return 'Страница не ответила. Проверьте адрес или попробуйте позже.'
    case 'invalid-url':
      return 'В цепочке попался адрес, который не разбирается.'
  }
}
