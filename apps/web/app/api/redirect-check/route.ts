/**
 * Проверка цепочки переадресаций: дожили ли метки до конечной страницы.
 *
 * Зачем это отдельная функция, а не «и так видно»: сокращатели, редиректы
 * рекламных кабинетов и «умные» ссылки CRM регулярно теряют query-строку —
 * человек видит рабочую ссылку и не понимает, почему в отчёте пусто.
 *
 * Роут тонкий: потолок частоты, разбор входа и вызов `checkRedirects`.
 * Вся сеть и предохранители SSRF — в `lib/redirect-fetch.ts`, логика цепочки —
 * в ядре. Так же будет устроен десктоп, только вместо роута будет команда Tauri.
 */

import { assertPublicUrl, normalizeBaseUrl } from '@utmka/core'

import { allow, readJson, tooMany } from '@/lib/rate-limit'
import { checkRedirects } from '@/lib/redirect-fetch'

/** Резолв имён нужен целиком, поэтому только Node-рантайм. */
export const runtime = 'nodejs'

/** Потолок длины адреса: разумная ссылка короче, длинная — попытка нас нагрузить. */
const MAX_URL_LENGTH = 2048

export async function POST(request: Request): Promise<Response> {
  // Роут открыт без входа, а сервер по нему ходит наружу — и не один раз,
  // а до десяти. Потолок по IP обязателен.
  if (!(await allow('redirect', request))) return tooMany()

  const body = await readJson<{ url?: unknown }>(request, 4096)
  if (!body) {
    return Response.json({ error: 'Не удалось прочитать запрос' }, { status: 400 })
  }

  const raw = typeof body.url === 'string' ? body.url : ''
  if (raw.length > MAX_URL_LENGTH) {
    return Response.json({ error: 'Слишком длинный адрес' }, { status: 400 })
  }

  const normalized = normalizeBaseUrl(raw)
  if (!normalized) {
    return Response.json({ error: 'Пустая ссылка' }, { status: 400 })
  }

  /* Ядро проверит это ещё раз внутри, но отвечать 400 на явно негодный адрес
     лучше сразу — до того, как мы куда-то пойдём. */
  const guard = assertPublicUrl(normalized)
  if (!guard.ok) {
    return Response.json(
      { error: 'Проверяем только публичные http и https-адреса' },
      { status: 400 },
    )
  }

  const report = await checkRedirects(normalized)
  return Response.json({ report })
}
