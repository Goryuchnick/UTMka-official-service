/**
 * Контракт оболочки. Ядро объявляет, ЧТО умеет внешний мир; КАК — знает только
 * оболочка: веб через роуты `/api` и Supabase, десктоп через `invoke` и SQLite.
 *
 * Зачем это понадобилось отдельным файлом при живых портах в `repository.ts`:
 * порты объявляли только хранилище и не покрывали ни сеть, ни вход, ни
 * помощника, — а экраны тем временем ходили в `/api` напрямую, разбирали
 * `response.status === 401` руками и писали текст ошибки сети шестью разными
 * способами. Контракт закрывает всю границу целиком, поэтому обещание
 * ARCHITECTURE §5 «десктоп получит SQLite без правки UI» становится
 * проверяемым типами, а не устным.
 *
 * Здесь ноль реализации — только типы. `repository.ts` не заменяется, а
 * расширяется: `UtmkaBackend` собирает его порты вместе с сетью и оболочкой.
 */

import type { RedirectReport } from './redirect'
import type {
  DictionaryPort,
  HistoryItem,
  HistoryPort,
  Template,
  TemplatesPort,
} from './repository'
import type { Issue, UtmParams } from './types'

/**
 * Чего в этой оболочке нет как ПОНЯТИЯ — не «выключено», а «не существует».
 *
 * Разница не косметическая: выключенное показывают серым с подписью «включите»,
 * несуществующего в интерфейсе нет вовсе. В десктопе нет входа, и приглашение
 * «заведите кодовую фразу» там было бы рекламой того, чего не будет.
 */
export interface Capabilities {
  /**
   * Где выполняется интерфейс.
   *
   * Нужно ровно для одного: показать дорогу во вторую оболочку. Веб зовёт на
   * версию для компьютера, окно — на веб-версию, и человек узнаёт, что вторая
   * вообще есть. Проверять оболочку по косвенным признакам (`fileSave` или
   * `auth`) — значит связать вид ссылки с чужим решением: выключим вход в вебе
   * — и он начнёт звать сам на себя.
   */
  shell: 'web' | 'desktop'
  /** Вход по кодовой фразе. Веб — true, десктоп — false. */
  auth: boolean
  /** Окно брифа на LLM. Веб — true, десктоп — false (ASSISTANT-SPEC п.4). */
  assistant: boolean
  /** Хранилище доступно. Веб — зависит от env, десктоп — всегда true. */
  storage: boolean
  /** Чем сохраняем файл: `<a download>` браузера или системный диалог. */
  fileSave: 'browser' | 'native'
}

export interface NetPort {
  /** Сокращение через clck.ru: у сервиса нет CORS, поэтому это всегда чужая земля. */
  shorten(url: string): Promise<string>
  /** Проход по цепочке. Предохранители SSRF — на стороне оболочки, правила — в ядре. */
  checkRedirects(url: string): Promise<RedirectReport>
}

/** Итог пакетной записи: сколько легло и что пропущено — поимённо, а не числом. */
export interface ImportResult {
  added: number
  /** Причины пропуска человеческими словами: «Осень 2026 — имя занято». */
  skipped: string[]
}

/**
 * Пакетная запись: импорт файла не должен делать 500 круглых поездок.
 *
 * В вебе это остаётся циклом внутри адаптера (роуты не меняются), в десктопе —
 * одна транзакция SQLite. Экраны разницы не видят и цикла у себя не держат.
 */
export interface ImportablePort<T> {
  importMany(rows: T[]): Promise<ImportResult>
}

/** Состояние входа. `unknown` — ещё не спрашивали сервер. */
export type AccountState = 'unknown' | 'guest' | 'member'

/** Вход по кодовой фразе. В десктопе не реализуется — там `account === null`. */
export interface AccountPort {
  state(): Promise<{ state: Exclude<AccountState, 'unknown'>; storage: boolean }>
  login(passphrase: string): Promise<void>
  /** Сервер придумывает фразу сам и отдаёт её ровно один раз. */
  register(): Promise<{ passphrase: string }>
  logout(): Promise<void>
}

/** Одна ссылка, предложенная моделью и уже прогнанная через правила ядра. */
export interface BriefLink {
  platform: string
  params: UtmParams
  url: string
  /** Сколько значений пришлось починить нормализацией. */
  fixed: number
  issues: Issue[]
}

/** Площадка, которую правила выбросили, и почему. */
export interface BriefDropped {
  platform: string
  why: string
}

export interface BriefQuota {
  available: boolean
  left: number
  limit: number
}

export interface BriefAnswer {
  links: BriefLink[]
  dropped: BriefDropped[]
  left?: number
  limit?: number
}

/** Помощник на LLM. В десктопе не реализуется — там `assistant === null`. */
export interface AssistantPort {
  quota(): Promise<BriefQuota>
  brief(text: string): Promise<BriefAnswer>
}

/**
 * Сохранение файла. Не поле `UtmkaBackend`, а отдельный экспорт оболочки:
 * к данным отношения не имеет, но фреймворк-зависим — в браузере это
 * `Blob` + `<a download>`, в окне Tauri системный диалог.
 *
 * Тело — либо текст (JSON, CSV, SVG), либо байты (PNG у QR-кода). Выгрузка QR
 * в растре и векторе — функция из паритета с 2.2, и заводить ради неё второй
 * путь сохранения, который в окне Tauri сломается молча, незачем.
 */
export type SaveFile = (name: string, mime: string, body: string | Uint8Array) => Promise<void>

/**
 * Обмен с веб-аккаунтом по кодовой фразе.
 *
 * Есть только в приложении на компьютере: у веба данные и так в аккаунте,
 * обмениваться ему не с кем. Транспорт — оболочка, правила слияния — ядро
 * (`planTemplates` / `planHistory`), решение «что отправить» принимает экран.
 *
 * ⚠️ Фраза уходит один раз, в обмен на сессию; хранится только сессия.
 */
export interface SyncPort {
  /** Привязан ли аккаунт и когда обменивались последний раз. */
  state(): Promise<{ linked: boolean; lastAt?: string }>
  link(passphrase: string): Promise<{ linked: boolean; lastAt?: string }>
  unlink(): Promise<{ linked: boolean; lastAt?: string }>
  /** Снимок аккаунта целиком — по нему считается план слияния. */
  pull(): Promise<{ templates: Template[]; links: HistoryItem[] }>
  /** Отправить недостающее одной пачкой, а не по записи на запрос. */
  push(
    templates: Omit<Template, 'id'>[],
    links: Omit<HistoryItem, 'id'>[],
  ): Promise<{ templatesAdded: number; linksAdded: number; skipped: string[] }>
}

export interface UtmkaBackend {
  caps: Capabilities
  templates: TemplatesPort & ImportablePort<Omit<Template, 'id'>>
  history: HistoryPort & ImportablePort<Omit<HistoryItem, 'id'>>
  dictionary: DictionaryPort
  net: NetPort
  /** `null` — входа нет как понятия. */
  account: AccountPort | null
  /** `null` — помощника на LLM нет как понятия. */
  assistant: AssistantPort | null
  /** `null` — обмениваться не с кем: это и есть та сторона, где лежит аккаунт. */
  sync: SyncPort | null
}

/**
 * Одна доменная ошибка вместо HTTP-семантики в экранах.
 *
 * До этого экраны сами разбирали `response.ok` и `response.status === 401`, а
 * комментарий «401 — не ошибка, а фразы нет» был продублирован дословно в двух
 * файлах. В десктопе HTTP нет вовсе, и такой разбор пришлось бы имитировать.
 */
export type BackendErrorKind =
  | 'auth' // нужна кодовая фраза; в десктопе не приходит никогда
  | 'limit' // упёрлись в потолок 500 или в дневную квоту помощника
  | 'conflict' // имя шаблона занято
  | 'offline' // сеть не ответила
  | 'rejected' // адрес не прошёл предохранители или сервер отказал по делу

export class BackendError extends Error {
  readonly kind: BackendErrorKind

  constructor(kind: BackendErrorKind, message: string) {
    super(message)
    this.name = 'BackendError'
    this.kind = kind
  }
}

/** Формулировки — в ядре, рядом с текстами `validate.ts`. Правило проекта. */
export const BACKEND_MESSAGES: Record<BackendErrorKind, string> = {
  auth: 'Чтобы сохранить, заведите кодовую фразу',
  limit: 'Больше 500 записей не храним — удалите лишнее',
  conflict: 'Шаблон с таким названием уже есть',
  offline: 'Сеть не отвечает — попробуйте ещё раз',
  rejected: 'Такой адрес проверить нельзя',
}

/** Текст ошибки для интерфейса: доменный `kind` знает, что сказать. */
export function backendMessage(error: unknown): string {
  if (error instanceof BackendError) return error.message
  return BACKEND_MESSAGES.offline
}

/** Это отказ из-за отсутствия входа? В десктопе всегда `false`. */
export function isAuthError(error: unknown): boolean {
  return error instanceof BackendError && error.kind === 'auth'
}
