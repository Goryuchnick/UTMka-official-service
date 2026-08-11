/** История собранных ссылок — только с сессией. Потолок держит `store.addHistory`. */

import { currentUser } from '@/lib/session'
import { addHistory, clearHistory, listHistory, removeHistory } from '@/lib/store'
import { storageConfigured } from '@/lib/supabase'
import type { HistoryItem } from '@utmka/core'

export const dynamic = 'force-dynamic'

const ORIGINS = new Set(['single', 'batch', 'brief', 'parse'])

async function guard(): Promise<{ hash: string } | Response> {
  if (!storageConfigured()) {
    return Response.json({ error: 'Хранилище не настроено' }, { status: 503 })
  }
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Нужна кодовая фраза' }, { status: 401 })
  return { hash: user.hash }
}

function fail(error: unknown): Response {
  return Response.json({ error: error instanceof Error ? error.message : 'Ошибка' }, { status: 400 })
}

export async function GET(): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth
  try {
    return Response.json({ items: await listHistory(auth.hash) })
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as Omit<HistoryItem, 'id'>
    if (!body?.url) return Response.json({ error: 'Пустая ссылка' }, { status: 400 })
    const origin = ORIGINS.has(body.origin) ? body.origin : 'single'
    return Response.json({ item: await addHistory(auth.hash, { ...body, origin }) })
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth

  const id = new URL(request.url).searchParams.get('id')
  try {
    if (id) await removeHistory(auth.hash, id)
    else await clearHistory(auth.hash)
    return Response.json({ ok: true })
  } catch (error) {
    return fail(error)
  }
}
