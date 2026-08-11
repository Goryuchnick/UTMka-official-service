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

async function spend(hash: string, was: number): Promise<void> {
  const day = new Date().toISOString().slice(0, 10)
  await supabase().from('llm_usage').upsert({ user_hash: hash, day, used: was + 1 })
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

  const used = await usedToday(user.hash)
  const limit = dailyLimit()
  if (used >= limit) {
    return Response.json(
      { error: `На сегодня лимит выбран (${limit}). Инструмент работает дальше — просто без подсказок.`, left: 0 },
      { status: 429 },
    )
  }

  let brief = ''
  try {
    const body = (await request.json()) as { brief?: unknown }
    brief = text(body.brief).slice(0, MAX_BRIEF)
  } catch {
    return Response.json({ error: 'Не удалось прочитать запрос' }, { status: 400 })
  }

  if (brief.length < 10) {
    return Response.json({ error: 'Опишите запуск парой фраз — куда ведём и где размещаемся' }, { status: 400 })
  }

  const known = PRESETS.map((preset) => `${preset.title}: source=${preset.params.source}, medium=${preset.params.medium}`)
  const answer = await askModel([
    { role: 'system', content: `${SYSTEM}\n\nИзвестные пресеты площадок:\n${known.join('\n')}` },
    { role: 'user', content: brief },
  ])

  if (!answer) {
    return Response.json({ error: 'Модель не ответила. Соберите вручную — это те же поля.' }, { status: 502 })
  }

  await spend(user.hash, used)

  const parsed = extractJson(answer)
  const rawLinks =
    typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { links?: unknown }).links)
      ? ((parsed as { links: unknown[] }).links as ModelLink[])
      : []

  if (rawLinks.length === 0) {
    return Response.json(
      { error: 'Модель ответила не по форме. Попробуйте описать запуск конкретнее.', left: limit - used - 1 },
      { status: 422 },
    )
  }

  // Базовый адрес модель не выдумывает: он либо пришёл из формы, либо его нет.
  let baseUrl = ''
  try {
    const body = (await request.clone().json()) as { baseUrl?: unknown }
    baseUrl = text(body.baseUrl)
  } catch {
    /* адрес необязателен */
  }

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
    left: Math.max(0, limit - used - 1),
    limit,
  })
}
