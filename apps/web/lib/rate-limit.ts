import 'server-only'

import { createHash } from 'crypto'

import { storageConfigured, supabase } from './supabase'

/**
 * Ограничение частоты запросов на таблице `utmka.rate_limits`.
 *
 * Зачем это здесь, хотя сервис маленький: без лимита ручка регистрации
 * позволяет в цикле создавать записи пользователей, а каждая такая запись —
 * это ещё одна дневная квота платного помощника. Связка «наделать фраз →
 * жечь routerai» стоит владельцу денег, поэтому лимит на регистрацию
 * обязателен, а не «на потом».
 *
 * Окно скользит грубо: одна строка на ключ, счётчик и время начала окна.
 * Точность здесь не нужна — нужен потолок.
 */

const HOUR_MS = 60 * 60 * 1000

export interface Limit {
  /** Длина окна в миллисекундах. */
  windowMs: number
  /** Сколько запросов в окне разрешено. */
  max: number
}

export const LIMITS = {
  /** Регистрация фразы: дорогая операция, ограничиваем жёстко. */
  register: { windowMs: HOUR_MS, max: 5 },
  /** Вход: защита от перебора. Фраза ~37 бит, но перебор всё равно не бесплатный. */
  login: { windowMs: 10 * 60 * 1000, max: 20 },
  /** Сокращатель: сервер ходит наружу, через нас можно долбить clck.ru. */
  shorten: { windowMs: 10 * 60 * 1000, max: 30 },
  /**
   * Проверка редиректов: один запрос — до десяти обращений наружу. Через нас
   * можно и сканировать чужой сайт, и устроить ему поток запросов, поэтому
   * потолок жёстче, чем у сокращателя.
   */
  redirect: { windowMs: 10 * 60 * 1000, max: 15 },
  /** Помощник: поверх дневной квоты — чтобы не выжигали её за минуту. */
  assistant: { windowMs: 10 * 60 * 1000, max: 10 },
} as const satisfies Record<string, Limit>

/**
 * IP клиента. За Caddy `X-Forwarded-For` дописывается справа, поэтому берём
 * **последний** элемент: первый пришёл от клиента и подделывается свободно.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last) return last
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

/** Сырые IP не храним: в ключ уходит усечённый хеш. */
function keyFor(scope: string, ip: string): string {
  return `${scope}:${createHash('sha256').update(ip).digest('hex').slice(0, 16)}`
}

/**
 * Возвращает `true`, если запрос разрешён. При недоступной базе пропускает:
 * инструмент важнее лимита, а без базы всё равно нечего защищать.
 */
export async function allow(scope: keyof typeof LIMITS, request: Request): Promise<boolean> {
  if (!storageConfigured()) return true

  const limit: Limit = LIMITS[scope]
  const key = keyFor(scope, clientIp(request))
  const now = new Date()

  const { data, error } = await supabase()
    .from('rate_limits')
    .select('count, window_started_at')
    .eq('key', key)
    .maybeSingle()

  if (error) return true

  const row = data as { count: number; window_started_at: string } | null
  const fresh = row && now.getTime() - new Date(row.window_started_at).getTime() < limit.windowMs

  if (!fresh) {
    await supabase()
      .from('rate_limits')
      .upsert({ key, count: 1, window_started_at: now.toISOString() })
    return true
  }

  if (row.count >= limit.max) return false

  await supabase().from('rate_limits').update({ count: row.count + 1 }).eq('key', key)
  return true
}

/** Ответ на превышение — одинаковый во всех роутах. */
export function tooMany(): Response {
  return Response.json(
    { error: 'Слишком часто. Подождите немного и попробуйте снова.' },
    { status: 429 },
  )
}

/**
 * Читает JSON с потолком по размеру. Без него в `params` можно положить
 * мегабайты и раздуть строку в базе.
 */
export async function readJson<T>(request: Request, maxBytes = 32_768): Promise<T | null> {
  const length = Number.parseInt(request.headers.get('content-length') ?? '', 10)
  if (Number.isFinite(length) && length > maxBytes) return null

  const text = await request.text()
  if (text.length > maxBytes) return null

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
