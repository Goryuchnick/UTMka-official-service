/**
 * Обмен с приложением на компьютере.
 *
 * `GET` отдаёт снимок аккаунта целиком, `POST` принимает пачку.
 *
 * Зачем отдельный роут, если есть `/api/templates` и `/api/history`: у человека
 * может быть пять сотен записей, а те роуты работают по одной. Пятьсот запросов
 * с проверкой сессии на каждом — это минуты и куча шансов оборваться на
 * середине, оставив данные наполовину перенесёнными.
 *
 * Что именно слать, решает приложение по правилам ядра (`planTemplates`,
 * `planHistory`) — сервер только исполняет и на всякий случай проверяет дубли.
 */

import { readJson } from '@/lib/rate-limit'
import { currentUser } from '@/lib/session'
import { syncPull, syncPush } from '@/lib/store'
import { storageConfigured } from '@/lib/supabase'
import type { HistoryItem, Template } from '@utmka/core'

export const dynamic = 'force-dynamic'

/** Потолок тела: 500 шаблонов и 500 ссылок с запасом на длинные адреса. */
const BODY_LIMIT = 2 * 1024 * 1024

async function guard(): Promise<{ hash: string } | Response> {
  if (!storageConfigured()) {
    return Response.json({ error: 'Хранилище не настроено' }, { status: 503 })
  }
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Нужна кодовая фраза' }, { status: 401 })
  return { hash: user.hash }
}

export async function GET(): Promise<Response> {
  const auth = await guard()
  if (auth instanceof Response) return auth

  try {
    return Response.json(await syncPull(auth.hash))
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
    templates?: Omit<Template, 'id'>[]
    links?: Omit<HistoryItem, 'id'>[]
  }>(request, BODY_LIMIT)

  if (!body) {
    return Response.json({ error: 'Слишком большой или битый запрос' }, { status: 400 })
  }

  try {
    return Response.json(
      await syncPush(auth.hash, {
        templates: Array.isArray(body.templates) ? body.templates : [],
        links: Array.isArray(body.links) ? body.links : [],
      }),
    )
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Ошибка' },
      { status: 400 },
    )
  }
}
