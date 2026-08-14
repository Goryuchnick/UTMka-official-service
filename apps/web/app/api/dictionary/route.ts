/**
 * Справочник значений — только с сессией.
 *
 * `POST` сводит расщепление: алиас (`Yandex`) начинает указывать на канон
 * (`yandex`). Само значение из истории не переписываем — там оно уже уехало
 * в отчёты площадки, и подмена задним числом соврала бы.
 */

import { readJson } from '@/lib/rate-limit'
import { currentUser } from '@/lib/session'
import { listDictionary, mergeValue, removeValue, trackValues } from '@/lib/store'
import { storageConfigured } from '@/lib/supabase'
import { UTM_KEYS, type DictKind, type UtmParams } from '@utmka/core'

export const dynamic = 'force-dynamic'

async function guard(): Promise<{ hash: string } | Response> {
  if (!storageConfigured()) {
    return Response.json({ error: 'Хранилище не настроено' }, { status: 503 })
  }
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Нужна кодовая фраза' }, { status: 401 })
  return { hash: user.hash }
}

function isKind(value: unknown): value is DictKind {
  return typeof value === 'string' && (UTM_KEYS as readonly string[]).includes(value)
}

export async function GET(): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth
  try {
    return Response.json({ items: await listDictionary(auth.hash) })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Ошибка' },
      { status: 400 },
    )
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth

  const body = await readJson<{
    kind?: unknown
    alias?: unknown
    canonical?: unknown
    track?: unknown
  }>(request, 4096)
  if (!body) return Response.json({ error: 'Слишком большой или битый запрос' }, { status: 400 })

  try {
    /* Учесть значения вручную — тем же путём, каким их учитывает сохранение
       ссылки. Нужно, чтобы канон можно было завести до первой ссылки; отдельной
       записи в обход `trackValues` не заводим, иначе счётчики разъедутся. */
    if (body.track && typeof body.track === 'object') {
      const params: UtmParams = {}
      for (const [key, value] of Object.entries(body.track as Record<string, unknown>)) {
        if (isKind(key) && typeof value === 'string' && value.trim()) params[key] = value.trim()
      }
      if (Object.keys(params).length === 0) {
        return Response.json({ error: 'Нечего добавлять' }, { status: 400 })
      }
      await trackValues(auth.hash, params)
      return Response.json({ ok: true })
    }

    if (!isKind(body.kind) || typeof body.alias !== 'string' || typeof body.canonical !== 'string') {
      return Response.json({ error: 'Не хватает данных для сведения' }, { status: 400 })
    }
    await mergeValue(auth.hash, body.kind, body.alias, body.canonical)
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Ошибка' },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const kind = url.searchParams.get('kind')
  const value = url.searchParams.get('value')
  if (!isKind(kind) || !value) {
    return Response.json({ error: 'Не указано значение' }, { status: 400 })
  }

  try {
    await removeValue(auth.hash, kind, value)
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Ошибка' },
      { status: 400 },
    )
  }
}
