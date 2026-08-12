import 'server-only'

/**
 * Клиент routerai.ru — RU-доступный OpenAI-совместимый шлюз.
 *
 * OpenRouter отдаёт 403 с российских дата-центров, поэтому все проекты
 * воркспейса ходят через routerai. Модель по умолчанию — qwen3-30b-a3b-instruct:
 * open-weight и быстрая; коммерческие flash/plus/max проксируются в облако
 * Alibaba и медленные, `*-thinking` не брать.
 *
 * Шлюз понимает `response_format: json_object`, но не strict json_schema —
 * форму задаём промптом, а ответ парсим лениво: модель иногда заворачивает
 * JSON в markdown-фенсы.
 */

const BASE_URL = process.env.ROUTERAI_BASE_URL ?? 'https://routerai.ru/api/v1'
const API_KEY = process.env.ROUTERAI_API_KEY
const MODEL = process.env.ROUTERAI_MODEL ?? 'qwen/qwen3-30b-a3b-instruct-2507'

const TIMEOUT_MS = 45_000

export function llmConfigured(): boolean {
  return Boolean(API_KEY)
}

/**
 * Дневной лимит на одну кодовую фразу. Видимый — показываем остаток.
 *
 * 50, а не 20: замер 2026-08-12 по ценам routerai (5,16 ₽/млн входа,
 * 20,67 ₽/млн выхода) даёт 1,2 коп. за самый тяжёлый запрос — то есть
 * 18 ₽/мес на человека, который выжигает квоту каждый день. Жать сильнее
 * смысла нет: экономия копеечная, а отказ помощника пользователь запомнит.
 */
export function dailyLimit(): number {
  const parsed = Number.parseInt(process.env.UTMKA_LLM_DAILY_LIMIT ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50
}

/** Снимает markdown-фенсы и вырезает первый сбалансированный объект. */
export function extractJson(raw: string): unknown | null {
  const text = raw.trim()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    /* дальше пробуем вычистить обёртку */
  }

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fence) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {
      /* и это не сработало — режем по скобкам */
    }
  }

  const start = text.search(/[[{]/)
  if (start < 0) return null
  const open = text[start]
  const close = open === '{' ? '}' : ']'

  let depth = 0
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === open) depth += 1
    else if (text[i] === close) {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

/** Один запрос к модели. Возвращает сырой текст ответа или null при любой беде. */
export async function askModel(messages: ChatMessage[]): Promise<string | null> {
  if (!API_KEY) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('routerai', response.status, (await response.text()).slice(0, 200))
      return null
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    return data.choices?.[0]?.message?.content ?? null
  } catch (error) {
    console.error('routerai', error)
    return null
  } finally {
    clearTimeout(timer)
  }
}
