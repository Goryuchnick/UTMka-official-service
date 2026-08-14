/**
 * Сокращение ссылки. Запрос идёт с сервера, а не из браузера: у clck.ru нет
 * CORS-заголовков, и прямой вызов из страницы падал бы.
 *
 * Провайдер — Яндекс (clck.ru), тот же, что в десктопе 2.2: российский,
 * без ключей и лимитов на регистрацию.
 *
 * ⚠️ Тот же класс риска, что у проверки редиректов: сервер ходит по адресу,
 * который прислал пользователь. Поэтому адрес проверяется предохранителями
 * ядра (`assertPublicUrl`) — только http/https и никаких внутренних сетей.
 */

import { assertPublicUrl, normalizeBaseUrl } from '@utmka/core'

import { allow, readJson, tooMany } from '@/lib/rate-limit'

const TIMEOUT_MS = 5000

export async function POST(request: Request): Promise<Response> {
  // Роут открыт без входа, а сервер по нему ходит наружу — значит через нас
  // можно долбить clck.ru. Потолок по IP обязателен.
  if (!(await allow('shorten', request))) return tooMany()

  const body = await readJson<{ url?: unknown }>(request, 4096)
  if (!body) {
    return Response.json({ error: 'Не удалось прочитать запрос' }, { status: 400 })
  }
  const url = typeof body.url === 'string' ? body.url : ''

  const normalized = normalizeBaseUrl(url)
  if (!normalized) {
    return Response.json({ error: 'Пустая ссылка' }, { status: 400 })
  }

  const guard = assertPublicUrl(normalized)
  if (!guard.ok) {
    return Response.json(
      { error: 'Сокращаем только публичные http и https-адреса' },
      { status: 400 },
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`https://clck.ru/--?url=${encodeURIComponent(normalized)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      /* Код чужого сервиса человеку ничего не говорит, а решение у него всего
         два: повторить или жить с длинной ссылкой. Код оставляем в скобках —
         по нему можно понять, отказал clck.ru или мы прислали ему что-то не
         то, и без него разбирать жалобу «не работает» не с чем. */
      const reason =
        response.status === 400
          ? 'clck.ru не принял этот адрес'
          : response.status === 429
            ? 'clck.ru просит подождать — слишком много запросов'
            : 'clck.ru сейчас не отвечает как надо'
      return Response.json(
        { error: `${reason} (код ${response.status}). Ссылка работает и без сокращения.` },
        { status: 502 },
      )
    }

    const short = (await response.text()).trim()
    if (!/^https?:\/\//.test(short)) {
      return Response.json({ error: 'Сервис вернул не ссылку' }, { status: 502 })
    }

    return Response.json({ short })
  } catch {
    return Response.json({ error: 'Сервис сокращения не ответил' }, { status: 504 })
  } finally {
    clearTimeout(timer)
  }
}
