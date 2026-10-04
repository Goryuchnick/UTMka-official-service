/**
 * Валидация. Ядро продукта и главное отличие от бесплатных генераторов:
 * каждая проверка объясняет **что сломается в отчёте**, а не «неверный формат»
 * (ASSISTANT-SPEC §2.1).
 *
 * Тексты живут здесь, а не в интерфейсе: одни и те же формулировки нужны форме,
 * маскоту, экрану разбора и пакетному режиму — и должны совпадать слово в слово.
 */

import { buildUrl } from './build'
import {
  isPlatformLiteral,
  MACRO_GROUPS,
  macrosForSource,
  macroTokenNames,
  PLACEHOLDER_RE,
  placeholderName,
  type MacroGroup,
} from './macros'
import { hasCyrillic, needsNormalization } from './normalize'
import type { ParsedLink } from './parse'
import type { Issue, LinkDraft, UtmKey, UtmParams } from './types'
import { UTM_KEYS, UTM_PARAM_NAMES } from './types'

/** Порог, после которого ссылки начинают резаться в почте и мессенджерах. */
const URL_LENGTH_WARN = 2000

/** Разумный потолок одного значения. */
const VALUE_LENGTH_WARN = 100

/**
 * Значения `medium`, объявляющие трафик бесплатным. Размеченная ссылка
 * бесплатной быть не может — её кто-то поставил в рекламу или рассылку.
 */
const FREE_MEDIUMS = new Set(['organic', 'none', '(none)', 'not_set', 'referral'])

/** Значения, которые люди по ошибке кладут в `medium` вместо `source`. */
const PLATFORM_LIKE = new Set([
  'vk', 'vkontakte', 'telegram', 'tg', 'facebook', 'fb', 'instagram', 'ig',
  'yandex', 'google', 'dzen', 'zen', 'ok', 'odnoklassniki', 'youtube',
  'whatsapp', 'viber', 'avito', 'tiktok', 'max',
])

/** Источники, у которых есть платный поиск: там `utm_term` осмыслен. */
const SEARCH_SOURCES = new Set(['yandex', 'google', 'yandex_direct', 'google_ads'])

/**
 * Подстановки, доставшиеся от старых кабинетов. Сам справочник их больше не
 * предлагает — VK свернул `vk.com/ads` в VK Рекламу с другим синтаксисом, а
 * Директ снял `{adtarget_name}` и `{addphrases}`, — но ссылки, собранные
 * раньше, живут в истории у людей, и ругаться на них задним числом незачем.
 */
const LEGACY_PLACEHOLDERS = ['client_id', 'ad_name', 'platform', 'campaign', 'adtarget_name', 'addphrases']

/**
 * Плейсхолдеры, которые реально подставляются площадками.
 *
 * Собирается из справочника `macros.ts`, а не переписывается рядом: иначе
 * выпадающий список советовал бы токен, на который валидатор тут же ругается
 * «неизвестная подстановка». Один источник — один ответ.
 */
export const KNOWN_PLACEHOLDERS = new Set([...macroTokenNames(), ...LEGACY_PLACEHOLDERS])

function issue(
  code: Issue['code'],
  level: Issue['level'],
  field: Issue['field'],
  message: string,
  consequence: string,
  fixable = false,
): Issue {
  return { code, level, field, message, consequence, fixable }
}

/** Проверки одного значения UTM-поля. */
export function validateValue(field: UtmKey, rawValue: string): Issue[] {
  const value = rawValue ?? ''
  if (!value.trim()) return []
  // Написание метки, которую площадка ставит сама, выбирала площадка: подогнать
  // его под наши правила — значит развести ручные и автоматические переходы.
  if (isPlatformLiteral(value)) return []

  const issues: Issue[] = []
  const param = UTM_PARAM_NAMES[field]
  // Подстановки площадка пишет сама и в своём регистре (`{{CampaignId}}`
  // у Unisender): «Чинить» их не трогает, значит и ругаться на них нечего.
  const withoutPlaceholders = value.replace(PLACEHOLDER_RE, '')

  if (/[A-ZА-ЯЁ]/.test(withoutPlaceholders)) {
    issues.push(
      issue(
        'value-uppercase',
        'warning',
        field,
        'Заглавные буквы',
        `«Facebook» и «facebook» — два разных источника в отчёте: строки по ним не сложатся, а разойдутся на две. Приведём ${param} к нижнему регистру.`,
        true,
      ),
    )
  }

  if (/\s/.test(value)) {
    issues.push(
      issue(
        'value-whitespace',
        'error',
        field,
        'Пробел в значении',
        'Пробел рвёт ссылку: в отчёт приедет обрезок до пробела, а остаток превратится в мусор. Заменим на подчёркивание.',
        true,
      ),
    )
  }

  if (hasCyrillic(value)) {
    issues.push(
      issue(
        'value-cyrillic',
        'warning',
        field,
        'Кириллица',
        'URL задуман под латиницу: кириллица уедет в процентную кодировку и в отчёте будет нечитаемой кашей вида %D0%B2%D0%BA. Транслитерируем.',
        true,
      ),
    )
  }

  if (/[&?#=%"'<>\\]/.test(withoutPlaceholders)) {
    issues.push(
      issue(
        'value-special-chars',
        'error',
        field,
        'Спецсимволы',
        'Символы & ? # = внутри значения разрывают разбор параметров: всё, что после них, аналитика прочитает как отдельный параметр. Уберём.',
        true,
      ),
    )
  }

  if (/^[_\-]|[_\-]$/.test(value.trim())) {
    issues.push(
      issue(
        'value-trailing-separator',
        'info',
        field,
        'Разделитель по краям',
        'Значение начинается или кончается разделителем — в отчёте это отдельная строка, не совпадающая с чистым написанием. Обрежем.',
        true,
      ),
    )
  }

  if (value.length > VALUE_LENGTH_WARN) {
    issues.push(
      issue(
        'value-too-long',
        'warning',
        field,
        `Длиннее ${VALUE_LENGTH_WARN} символов`,
        'Длинные значения обрезаются в интерфейсах отчётов — вы не сможете отличить одну кампанию от другой по первым символам.',
      ),
    )
  }

  for (const match of value.matchAll(PLACEHOLDER_RE)) {
    const token = match[0]
    if (!KNOWN_PLACEHOLDERS.has(placeholderName(token))) {
      issues.push(
        issue(
          'placeholder-unknown',
          'warning',
          field,
          `Неизвестная подстановка ${token}`,
          `Площадка не знает токен ${token} и подставит его буквально — в отчёте вы увидите текст «${token}» вместо данных.`,
        ),
      )
    }
  }

  return issues
}

/**
 * Подходит ли подстановка площадке из `utm_source`. Токен может быть известен
 * справочнику и всё равно не сработать: `{campaign_id}` — это Директ, а VK
 * понимает только `{{…}}`; `{campaignid}` — это Google. Ссылка при этом
 * открывается, и ошибка всплывает только в отчёте, литералом в скобках.
 *
 * Незнакомые никому токены здесь не трогаем — про них уже сказал
 * `placeholder-unknown`, второе замечание о том же только шумит.
 */
function placeholderSyntaxIssue(group: MacroGroup, field: UtmKey, token: string): Issue | null {
  const lower = token.toLowerCase()
  const name = placeholderName(token)

  if (group.macros.some((macro) => macro.token.toLowerCase() === lower)) return null

  if (group.macros.length === 0) {
    return issue(
      'placeholder-wrong-syntax',
      'warning',
      field,
      `У площадки ${group.title} подстановок нет`,
      `${group.title} ничего не подставляет: ${token} приедет в отчёт буквально, текстом в скобках вместо данных.`,
    )
  }

  const sameName = group.macros.find((macro) => placeholderName(macro.token) === name)
  if (sameName) {
    return issue(
      'placeholder-wrong-syntax',
      'warning',
      field,
      `Не те скобки для площадки ${group.title}`,
      `${group.title} понимает ${sameName.token}, а ${token} не узнает и вставит как есть — в отчёте будет текст «${token}» вместо данных.`,
    )
  }

  const owner = MACRO_GROUPS.find(
    (other) => other !== group && other.macros.some((macro) => macro.token.toLowerCase() === lower),
  )
  if (owner) {
    return issue(
      'placeholder-wrong-syntax',
      'warning',
      field,
      `Подстановка другой площадки — ${owner.title}`,
      `${token} — подстановка площадки ${owner.title}. ${group.title} её не знает и вставит как есть — в отчёте будет текст «${token}» вместо данных.`,
    )
  }

  return null
}

/** Семантические ловушки: метка есть, а данные врут. */
export function validateSemantics(params: UtmParams): Issue[] {
  const issues: Issue[] = []
  const source = (params.source ?? '').trim().toLowerCase()
  const medium = (params.medium ?? '').trim().toLowerCase()
  const term = (params.term ?? '').trim()

  if (medium && FREE_MEDIUMS.has(medium)) {
    issues.push(
      issue(
        'semantic-paid-as-organic',
        'warning',
        'medium',
        `medium=${medium} на размеченной ссылке`,
        'Размеченный трафик по определению не бесплатный: эту ссылку кто-то поставил в рекламу, посев или рассылку. С таким medium расходы и переходы окажутся в разных строках отчёта, и посчитать окупаемость будет нечем.',
      ),
    )
  }

  if (medium && PLATFORM_LIKE.has(medium)) {
    issues.push(
      issue(
        'semantic-source-in-medium',
        'warning',
        'medium',
        'Площадка вместо типа трафика',
        `«${medium}» — это площадка, её место в utm_source. В utm_medium идёт тип трафика: social для постов, cpc для рекламы, email для рассылки. Если перепутать, отчёт по каналам развалится.`,
      ),
    )
  }

  if (medium === 'cpc' && SEARCH_SOURCES.has(source) && !term) {
    issues.push(
      issue(
        'semantic-search-without-term',
        'info',
        'term',
        'Нет utm_term',
        'На поисковой рекламе без utm_term вы не увидите, по каким запросам шли показы. Для Директа сюда ставят {keyword} — площадка подставит фразу сама.',
      ),
    )
  }

  const group = macrosForSource(source)
  if (group) {
    for (const key of UTM_KEYS) {
      for (const match of (params[key] ?? '').matchAll(PLACEHOLDER_RE)) {
        const found = placeholderSyntaxIssue(group, key, match[0])
        if (found) issues.push(found)
      }
    }
  }

  return issues
}

/** Не хватает ли обязательного минимума. */
export function validateCompleteness(params: UtmParams): Issue[] {
  const issues: Issue[] = []
  const filled = UTM_KEYS.filter((key) => (params[key] ?? '').trim() !== '')
  if (filled.length === 0) return issues

  if (!(params.source ?? '').trim()) {
    issues.push(
      issue(
        'param-missing-required',
        'warning',
        'source',
        'Не заполнен источник',
        'Без utm_source аналитика не поймёт, откуда пришёл человек, и сложит переходы в «не определено» — вместе с чужим трафиком.',
      ),
    )
  }

  if (!(params.medium ?? '').trim()) {
    issues.push(
      issue(
        'param-missing-required',
        'warning',
        'medium',
        'Не заполнен канал',
        'Без utm_medium не отделить рекламу от поста и рассылки: весь трафик площадки схлопнется в одну строку.',
      ),
    )
  }

  if (!(params.campaign ?? '').trim()) {
    issues.push(
      issue(
        'param-missing-required',
        'info',
        'campaign',
        'Не заполнена кампания',
        'Без utm_campaign вы не разделите два запуска на одной площадке — сентябрьский и ноябрьский окажутся одной строкой.',
      ),
    )
  }

  return issues
}

/** Полная проверка черновика: адрес, значения, семантика, полнота, длина. */
export function validateDraft(draft: LinkDraft): Issue[] {
  const issues: Issue[] = []
  const raw = (draft.baseUrl ?? '').trim()

  if (!raw) {
    issues.push(
      issue(
        'url-empty',
        'error',
        'baseUrl',
        'Не указан адрес',
        'Ссылку не на что вешать: сначала адрес страницы, куда ведём людей.',
      ),
    )
  } else {
    if (!/^https?:\/\//i.test(raw)) {
      issues.push(
        issue(
          'url-no-scheme',
          'info',
          'baseUrl',
          'Нет https://',
          'Допишем https:// сами — без схемы ссылка не кликается в письмах и мессенджерах.',
          true,
        ),
      )
    }

    const built = buildUrl(draft)
    let hostOk = false
    try {
      const url = new URL(built || raw)
      hostOk = url.hostname.includes('.') && !/\s/.test(url.hostname)
    } catch {
      hostOk = false
    }

    if (!hostOk) {
      issues.push(
        issue(
          'url-invalid',
          'error',
          'baseUrl',
          'Адрес не разбирается',
          'Проверьте домен: похоже, в адресе опечатка или лишние символы. Ссылку с таким адресом никто не откроет.',
        ),
      )
    }

    if (built.length > URL_LENGTH_WARN) {
      issues.push(
        issue(
          'url-too-long',
          'warning',
          'url',
          `Длина ${built.length} символов`,
          'Такие ссылки режутся в почтовых клиентах и мессенджерах: часть меток отвалится по дороге, и переход придёт без разметки. Уберите лишние параметры или сократите ссылку.',
        ),
      )
    }
  }

  for (const key of UTM_KEYS) {
    issues.push(...validateValue(key, draft.params[key] ?? ''))
  }

  issues.push(...validateCompleteness(draft.params))
  issues.push(...validateSemantics(draft.params))

  return issues
}

/** Проверка чужой разобранной ссылки — для экрана «разбор». */
export function validateParsed(parsed: ParsedLink): Issue[] {
  const issues: Issue[] = []

  if (!parsed.valid) {
    issues.push(
      issue(
        'url-invalid',
        'error',
        'baseUrl',
        'Ссылка не разбирается',
        'Это не похоже на адрес: проверьте, что скопировали целиком, вместе с доменом.',
      ),
    )
    return issues
  }

  for (const name of parsed.duplicates) {
    issues.push(
      issue(
        'param-duplicate',
        'error',
        'url',
        `Параметр ${name} встречается дважды`,
        `Два ${name} в одной ссылке — поведение непредсказуемо: какое значение попадёт в отчёт, решает уже сама аналитика, и у разных систем ответ разный.`,
        true,
      ),
    )
  }

  for (const key of UTM_KEYS) {
    issues.push(...validateValue(key, parsed.params[key] ?? ''))
  }

  issues.push(...validateCompleteness(parsed.params))
  issues.push(...validateSemantics(parsed.params))

  return issues
}

/** Худший уровень в списке — для цвета индикатора. */
export function worstLevel(issues: readonly Issue[]): Issue['level'] | null {
  if (issues.some((i) => i.level === 'error')) return 'error'
  if (issues.some((i) => i.level === 'warning')) return 'warning'
  if (issues.some((i) => i.level === 'info')) return 'info'
  return null
}

/** Чинится ли всё найденное одним нажатием «привести в порядок». */
export function isFullyFixable(issues: readonly Issue[]): boolean {
  const blocking = issues.filter((i) => i.level !== 'info')
  return blocking.length > 0 && blocking.every((i) => i.fixable)
}

/** Значения, которые нормализация изменит. Нужно предпросмотру «до / после». */
export function fixablePreview(params: UtmParams): UtmKey[] {
  return UTM_KEYS.filter((key) => {
    const value = params[key]
    return typeof value === 'string' && value !== '' && needsNormalization(value)
  })
}
