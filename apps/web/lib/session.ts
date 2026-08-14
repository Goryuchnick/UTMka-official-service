import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

import { supabase } from './supabase'

/**
 * Сессия по кодовой фразе.
 *
 * В cookie лежит `<hash>.<подпись>`, где подпись — HMAC от hash на
 * `AUTH_COOKIE_SECRET`. Самого hash достаточно, чтобы найти пользователя,
 * подпись нужна лишь затем, чтобы его нельзя было подставить руками.
 *
 * Домен куки не задаём: инструмент живёт на своём субдомене и делить сессию
 * с сайтом не должен — там свой секрет и свои аккаунты (ARCHITECTURE §7).
 */

export const SESSION_COOKIE = 'utmka_session'
export const SESSION_TTL_SEC = 60 * 60 * 24 * 365

export interface SessionUser {
  hash: string
  createdAt: string
  isBlocked: boolean
}

function cookieSecret(): string {
  const value = process.env.AUTH_COOKIE_SECRET ?? process.env.UTMKA_PASSPHRASE_HMAC_SECRET ?? ''
  if (value.length < 16) {
    throw new Error('AUTH_COOKIE_SECRET отсутствует или короче 16 символов')
  }
  return value
}

function sign(hash: string): string {
  return `${hash}.${createHmac('sha256', cookieSecret()).update(hash).digest('hex')}`
}

function verify(value: string | undefined): string | null {
  if (!value) return null
  const dot = value.indexOf('.')
  if (dot < 1) return null

  const hash = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  const expected = createHmac('sha256', cookieSecret()).update(hash).digest('hex')

  try {
    if (sig.length !== expected.length) return null
    if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null
  } catch {
    return null
  }
  return hash
}

export async function setSession(hash: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, sign(hash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  })
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/** Хеш из подписанной куки, без похода в базу. */
export async function sessionHash(): Promise<string | null> {
  const store = await cookies()
  return verify(store.get(SESSION_COOKIE)?.value)
}

/**
 * Текущий пользователь или null. Заблокированный считается отсутствующим —
 * инструмент при этом продолжает работать, просто без хранения.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const hash = await sessionHash()
  if (!hash) return null

  const { data, error } = await supabase()
    .from('users')
    .select('hash, created_at, is_blocked')
    .eq('hash', hash)
    .maybeSingle()

  if (error || !data || data.is_blocked) return null
  return { hash: data.hash, createdAt: data.created_at, isBlocked: false }
}

/** Отметка «был здесь» — по ней видно живые аккаунты без всяких ПД. */
export async function touchUser(hash: string): Promise<void> {
  await supabase().from('users').update({ last_seen_at: new Date().toISOString() }).eq('hash', hash)
}
