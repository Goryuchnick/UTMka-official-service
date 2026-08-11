/**
 * Вход по кодовой фразе.
 *
 * `POST { mode: 'register' }` — сервер сам придумывает фразу, заводит запись и
 * возвращает фразу ровно один раз: она нигде не хранится, восстановить нельзя.
 * `POST { mode: 'login', passphrase }` — сверяем hash с базой.
 * `DELETE` — выход.
 *
 * Персональных данных не принимаем вообще: в базу уходит только HMAC фразы.
 */

import {
  generatePassphrase,
  hasMixedScripts,
  hashPassphrase,
  isValidPassphraseShape,
} from '@/lib/passphrase'
import { clearSession, currentUser, setSession, touchUser } from '@/lib/session'
import { storageConfigured, supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Body {
  mode?: unknown
  passphrase?: unknown
}

export async function GET(): Promise<Response> {
  if (!storageConfigured()) return Response.json({ user: null, storage: false })
  const user = await currentUser()
  return Response.json({ user: user ? { hash: user.hash.slice(0, 8) } : null, storage: true })
}

export async function POST(request: Request): Promise<Response> {
  if (!storageConfigured()) {
    return Response.json({ error: 'Хранилище не настроено' }, { status: 503 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return Response.json({ error: 'Не удалось прочитать запрос' }, { status: 400 })
  }

  const mode = body.mode === 'register' ? 'register' : 'login'

  if (mode === 'register') {
    // Коллизия фразы практически невозможна, но вставка всё равно может
    // упереться в существующий hash — тогда просто пробуем ещё раз.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const passphrase = generatePassphrase()
      const hash = hashPassphrase(passphrase)

      const { error } = await supabase().from('users').insert({ hash })
      if (!error) {
        await setSession(hash)
        return Response.json({ passphrase })
      }
      if (error.code !== '23505') {
        return Response.json({ error: 'Не удалось завести фразу' }, { status: 500 })
      }
    }
    return Response.json({ error: 'Не удалось завести фразу' }, { status: 500 })
  }

  const passphrase = typeof body.passphrase === 'string' ? body.passphrase : ''

  if (hasMixedScripts(passphrase)) {
    return Response.json(
      { error: 'В фразе смешаны русские и латинские буквы — похоже на раскладку клавиатуры' },
      { status: 400 },
    )
  }
  if (!isValidPassphraseShape(passphrase)) {
    return Response.json(
      { error: 'Фраза не похожа на настоящую: пять слов и число через дефис' },
      { status: 400 },
    )
  }

  const hash = hashPassphrase(passphrase)
  const { data, error } = await supabase()
    .from('users')
    .select('hash, is_blocked')
    .eq('hash', hash)
    .maybeSingle()

  if (error) return Response.json({ error: 'Хранилище недоступно' }, { status: 503 })
  if (!data || (data as { is_blocked: boolean }).is_blocked) {
    return Response.json({ error: 'Такой фразы нет. Проверьте написание или заведите новую' }, { status: 404 })
  }

  await setSession(hash)
  await touchUser(hash)
  return Response.json({ ok: true })
}

export async function DELETE(): Promise<Response> {
  await clearSession()
  return Response.json({ ok: true })
}
