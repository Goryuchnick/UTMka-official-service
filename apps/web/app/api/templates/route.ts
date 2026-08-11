/** Шаблоны — только с сессией. Чужой `user_hash` подставить нельзя: он берётся из куки. */

import { readJson } from '@/lib/rate-limit'
import { currentUser } from '@/lib/session'
import { createTemplate, listTemplates, removeTemplate, updateTemplate } from '@/lib/store'
import { storageConfigured } from '@/lib/supabase'
import type { Template } from '@utmka/core'

export const dynamic = 'force-dynamic'

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
    return Response.json({ items: await listTemplates(auth.hash) })
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth

  const body = await readJson<Omit<Template, 'id'>>(request)
  if (!body) return Response.json({ error: 'Слишком большой или битый запрос' }, { status: 400 })

  try {
    if (!body?.name?.trim()) {
      return Response.json({ error: 'Без названия шаблон не найдётся' }, { status: 400 })
    }
    return Response.json({ item: await createTemplate(auth.hash, { ...body, name: body.name.trim() }) })
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth

  const body = await readJson<{ id?: string } & Partial<Omit<Template, 'id'>>>(request)
  if (!body) return Response.json({ error: 'Слишком большой или битый запрос' }, { status: 400 })

  try {
    if (!body?.id) return Response.json({ error: 'Не указан шаблон' }, { status: 400 })
    const { id, ...patch } = body
    return Response.json({ item: await updateTemplate(auth.hash, id, patch) })
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'Не указан шаблон' }, { status: 400 })

  try {
    await removeTemplate(auth.hash, id)
    return Response.json({ ok: true })
  } catch (error) {
    return fail(error)
  }
}
