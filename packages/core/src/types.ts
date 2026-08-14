/**
 * Базовые типы слоя правил.
 *
 * Ядро ничего не знает о сети, DOM, Supabase и React: всё, что требует внешнего
 * мира, принимается параметром. Это условие переезда в Tauri без переписывания.
 */

/** Пять UTM-полей. Порядок массива = порядок параметров в собранной ссылке. */
export const UTM_KEYS = ['source', 'medium', 'campaign', 'content', 'term'] as const

export type UtmKey = (typeof UTM_KEYS)[number]

/** Имена параметров в URL. */
export const UTM_PARAM_NAMES: Record<UtmKey, string> = {
  source: 'utm_source',
  medium: 'utm_medium',
  campaign: 'utm_campaign',
  content: 'utm_content',
  term: 'utm_term',
}

/** Обратная карта: `utm_source` → `source`. */
export const UTM_KEY_BY_PARAM: Record<string, UtmKey> = Object.fromEntries(
  UTM_KEYS.map((key) => [UTM_PARAM_NAMES[key], key]),
) as Record<string, UtmKey>

export type UtmParams = Partial<Record<UtmKey, string>>

/** Черновик ссылки: то, что пользователь набрал в форме. */
export interface LinkDraft {
  baseUrl: string
  params: UtmParams
}

/** Поле, к которому относится замечание. `url` — к ссылке целиком. */
export type IssueField = UtmKey | 'baseUrl' | 'url'

/**
 * Уровни. `error` — ссылка сломана или данные точно разъедутся;
 * `warning` — работать будет, но отчёт соврёт; `info` — стоит знать.
 */
export type IssueLevel = 'error' | 'warning' | 'info'

export type IssueCode =
  | 'url-empty'
  | 'url-invalid'
  | 'url-no-scheme'
  | 'url-too-long'
  | 'value-uppercase'
  | 'value-whitespace'
  | 'value-cyrillic'
  | 'value-special-chars'
  | 'value-trailing-separator'
  | 'value-too-long'
  | 'param-duplicate'
  | 'param-missing-required'
  | 'semantic-paid-as-organic'
  | 'semantic-source-in-medium'
  | 'semantic-search-without-term'
  | 'placeholder-unknown'

/**
 * Замечание. `message` — короткая строка под полем; `consequence` — то, что
 * ломается в отчёте, человеческими словами (ASSISTANT-SPEC §2.1: не «ошибка
 * формата», а последствие). Маскот говорит `consequence`, форма — `message`.
 */
export interface Issue {
  code: IssueCode
  level: IssueLevel
  field: IssueField
  message: string
  consequence: string
  /** Чинится ли нормализацией в один клик. */
  fixable: boolean
}

/** Одно изменение, сделанное нормализацией. Показываем «до / после». */
export interface NormalizationChange {
  field: IssueField
  before: string
  after: string
}

/** Виды значений справочника — те же пять полей. */
export type DictKind = UtmKey

/** Запись справочника: значение, которым пользователь уже пользовался. */
export interface DictEntry {
  kind: DictKind
  value: string
  uses: number
  /** Если заполнено — значение сведено к канону и считается его алиасом. */
  canonical?: string
  firstSeenAt?: string
  lastUsedAt?: string
}

/** Динамическая подстановка площадки: `{keyword}` и что она вернёт. */
export interface PresetPlaceholder {
  token: string
  meaning: string
}

/** Пресет площадки: готовый набор значений + объяснение. */
export interface Preset {
  id: string
  /** Название плитки в простом режиме. */
  title: string
  /** Одна строка под названием: когда это брать. */
  hint: string
  params: UtmParams
  /** Почему source именно такой, а medium такой — главная путаница новичков. */
  explain: string
  placeholders?: PresetPlaceholder[]
  /** Предупреждение площадки (напр. Telegram Ads не умеет динамику). */
  caveat?: string
}

/** Строка пакетного режима. */
export interface BatchRow {
  /** Метка строки для человека: «ВК, пост 1». Не попадает в ссылку. */
  label?: string
  /** Если пусто — берётся общий базовый URL пакета. */
  baseUrl?: string
  params: UtmParams
}

/** Результат сборки одной строки пакета. */
export interface BatchResult {
  label?: string
  url: string
  issues: Issue[]
}
