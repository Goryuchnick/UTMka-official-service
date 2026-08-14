/**
 * Помощник: свободный текст брифа → пакет готовых ссылок.
 *
 * Единственный сценарий, где языковая модель действительно нужна: разложить
 * человеческую фразу «запускаем осенний набор на Директ, ВК и рассылку» по
 * площадкам. Всё остальное умеют правила, и делают это надёжнее.
 *
 * ⚠️ Ответ модели НИКОГДА не выдаётся как есть: он проходит `normalizeDraft`
 * и `validateDraft` из ядра, и то, что не чинится правилами, выбрасывается с
 * пометкой. Последняя инстанция — правила, а не модель (ASSISTANT-SPEC §3).
 *
 * Доступ только с кодовой фразой: это единственный платный ресурс, и квоту
 * на анонима не посчитать. Кончилась квота — инструмент работает дальше.
 */

import {
  buildUrl,
  normalizeDraft,
  PRESETS,
  validateDraft,
  type LinkDraft,
  type UtmKey,
} from '@utmka/core'

import { allow, readJson, tooMany } from '@/lib/rate-limit'
import { askModel, dailyLimit, extractJson, llmConfigured } from '@/lib/routerai'
import { currentUser } from '@/lib/session'
import { storageConfigured, supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const MAX_BRIEF = 1200
const MAX_LINKS = 12

const SYSTEM = `Ты помощник по UTM-меткам. По брифу маркетолога собери набор ссылок для площадок.

Отвечай ТОЛЬКО JSON вида:
{"links":[{"platform":"Яндекс.Директ","source":"yandex","medium":"cpc","campaign":"osenniy_nabor_2026-09","content":"","term":"{keyword}"}]}

Правила:
- source — площадка (yandex, vk, telegram, email), medium — ТИП трафика (cpc, social, email, banner). Не путай.
- значения только латиницей в нижнем регистре, слова через подчёркивание, без пробелов.
- campaign одинаковый для всех ссылок одного запуска — иначе запуск развалится на части в отчёте.
- динамические подстановки площадок оставляй в фигурных скобках как есть: {keyword}, {ad_id}.
- если площадка в брифе не названа явно, не выдумывай её.
- максимум 12 ссылок.
- platform — человеческое название площадки по-русски, для подписи.`

interface ModelLink {
  platform?: unknown
  source?: unknown
  medium?: unknown
  campaign?: unknown
  content?: unknown
  term?: unknown
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Сколько израсходовано сегодня. День считаем по UTC — так же, как в БД. */
async function usedToday(hash: string): Promise<number> {
  const day = new Date().toISOString().slice(0, 10)
  const { data } = await supabase()
    .from('llm_usage')
    .select('used')
    .eq('user_hash', hash)
    .eq('day', day)
    .maybeSingle()
  return (data as { used: number } | null)?.used ?? 0
}

/**
 * Занять единицу квоты ДО обращения к модели. Возвращает новое значение
 * счётчика или -1, если квота уже выбрана.
 *
 * ⚠️ Резерв именно заранее и одним запросом (`utmka.spend_llm_quota`,
 * миграция 0002). Раньше остаток читался в начале обработчика, а списание
 * шло после ответа модели — между этим лежали секунды, за которые пачка
 * параллельных запросов успевала прочитать один и тот же остаток и сходить
 * в платную модель десять раз при счётчике «плюс один». Не возвращать
 * списание обратно после вызова.
 */
async function reserve(hash: string, limit: number): Promise<number> {
  const day = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase().rpc('spend_llm_quota', {
    p_hash: hash,
    p_day: day,
    p_limit: limit,
  })
  if (error) return -1
  return typeof data === 'number' ? data : -1
}

/** Вернуть резерв: модель не ответила — платить не за что. */
async function refund(hash: string): Promise<void> {
  const day = new Date().toISOString().slice(0, 10)
  await supabase().rpc('refund_llm_quota', { p_hash: hash, p_day: day })
}

export async function GET(): Promise<Response> {
  if (!llmConfigured() || !storageConfigured()) {
    return Response.json({ available: false, left: 0, limit: 0 })
  }
  const user = await currentUser()
  if (!user) return Response.json({ available: true, left: 0, limit: dailyLimit(), guest: true })

  const used = await usedToday(user.hash)
  return Response.json({ available: true, left: Math.max(0, dailyLimit() - used), limit: dailyLimit() })
}

export async function POST(request: Request): Promise<Response> {
  if (!llmConfigured() || !storageConfigured()) {
    return Response.json({ error: 'Помощник сейчас недоступен' }, { status: 503 })
  }

  const user = await currentUser()
  if (!user) {
    return Response.json(
      { error: 'Помощнику нужна кодовая фраза: без неё не посчитать лимит' },
      { status: 401 },
    )
  }

  // Поверх дневной квоты — потолок по IP, чтобы её не выжигали за минуту.
  if (!(await allow('assistant', request))) return tooMany()

  const limit = dailyLimit()

  const body = await readJson<{ brief?: unknown; baseUrl?: unknown }>(request, 8192)
  if (!body) {
    return Response.json({ error: 'Не удалось прочитать запрос' }, { status: 400 })
  }
  const brief = text(body.brief).slice(0, MAX_BRIEF)

  if (brief.length < 10) {
    return Response.json({ error: 'Опишите запуск парой фраз — куда ведём и где размещаемся' }, { status: 400 })
  }

  /* Квоту занимаем здесь — после проверки запроса, но ДО похода в модель.
     Разбор входа ничего не стоит, а вот вызов модели стоит денег, и именно
     он должен быть за счётчиком. */
  const used = await reserve(user.hash, limit)
  if (used < 0) {
    return Response.json(
      { error: `На сегодня лимит выбран (${limit}). Инструмент работает дальше — просто без подсказок.`, left: 0 },
      { status: 429 },
    )
  }

  const known = PRESETS.map((preset) => `${preset.title}: source=${preset.params.source}, medium=${preset.params.medium}`)
  const answer = await askModel([
    { role: 'system', content: `${SYSTEM}\n\nИзвестные пресеты площадок:\n${known.join('\n')}` },
    { role: 'user', content: brief },
  ])

  if (!answer) {
    await refund(user.hash)
    return Response.json({ error: 'Модель не ответила. Соберите вручную — это те же поля.' }, { status: 502 })
  }

  const parsed = extractJson(answer)
  /* Каждый элемент проверяем на объектность: модель присылает и `[null]`,
     и массив строк. Без фильтра `raw[key]` уронил бы обработчик уже ПОСЛЕ
     списания квоты — человек терял бы её и получал голый 500 вместо
     понятного отказа. */
  const rawLinks: ModelLink[] =
    typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { links?: unknown }).links)
      ? ((parsed as { links: unknown[] }).links.filter(
          (item): item is ModelLink => typeof item === 'object' && item !== null,
        ) as ModelLink[])
      : []

  if (rawLinks.length === 0) {
    // Модель отработала (и стоила денег), но ответ негодный — квоту возвращаем:
    // человек не виноват, что она ответила не по форме.
    await refund(user.hash)
    return Response.json(
      { error: 'Модель ответила не по форме. Попробуйте описать запуск конкретнее.', left: Math.max(0, limit - used + 1) },
      { status: 422 },
    )
  }

  // Базовый адрес модель не выдумывает: он либо пришёл из формы, либо его нет.
  const baseUrl = text(body.baseUrl)

  const results = rawLinks.slice(0, MAX_LINKS).map((raw) => {
    const params: Partial<Record<UtmKey, string>> = {}
    for (const key of ['source', 'medium', 'campaign', 'content', 'term'] as const) {
      const value = text(raw[key])
      if (value) params[key] = value
    }

    // Правила — последняя инстанция. Сначала чиним, потом проверяем то, что вышло.
    const draft: LinkDraft = { baseUrl, params }
    const { draft: tidy, changes } = normalizeDraft(draft)
    const issues = validateDraft(tidy)
    const broken = issues.filter((issue) => issue.level === 'error')

    return {
      platform: text(raw.platform) || tidy.params.source || 'Площадка',
      params: tidy.params,
      url: buildUrl(tidy),
      fixed: changes.length,
      issues: issues.filter((issue) => issue.level !== 'error'),
      dropped: broken.length > 0,
      why: broken[0]?.consequence ?? '',
    }
  })

  return Response.json({
    links: results.filter((item) => !item.dropped),
    dropped: results.filter((item) => item.dropped),
    left: Math.max(0, limit - used),
    limit,
  })
}
