/**
 * Порты хранилища. Ядро объявляет, что ему нужно; реализуют — оболочки:
 * веб через серверные роуты и Supabase, десктоп через локальный SQLite.
 *
 * Смысл интерфейса ровно один: экраны пишутся один раз и работают в обеих
 * оболочках без развилок «если веб — то так».
 */

import type { DictEntry, DictKind, UtmParams } from './types'

/** Шаблон: сохранённый набор меток. Поля тега — паритет с 2.2. */
export interface Template {
  id: string
  name: string
  baseUrl?: string
  params: UtmParams
  tagName?: string
  tagColor?: string
  presetId?: string
  createdAt?: string
  updatedAt?: string
}

/** Запись истории. `shortUrl` появляется после сокращения — как в 2.2. */
export interface HistoryItem {
  id: string
  url: string
  baseUrl: string
  params: UtmParams
  shortUrl?: string
  tagName?: string
  tagColor?: string
  origin: 'single' | 'batch' | 'brief' | 'parse'
  batchId?: string
  createdAt?: string
}

/** Настройки интерфейса. Единственное, что живёт локально до входа. */
export interface Settings {
  theme?: 'light' | 'dark'
  locale?: 'ru' | 'en'
  generatorMode?: 'simple' | 'pro'
  historyView?: 'list' | 'grid' | 'table'
  templatesView?: 'list' | 'grid' | 'table'
}

export interface TemplatesPort {
  list(): Promise<Template[]>
  create(input: Omit<Template, 'id'>): Promise<Template>
  update(id: string, patch: Partial<Omit<Template, 'id'>>): Promise<Template>
  remove(id: string): Promise<void>
}

export interface HistoryPort {
  list(limit?: number): Promise<HistoryItem[]>
  add(input: Omit<HistoryItem, 'id'>): Promise<HistoryItem>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

export interface DictionaryPort {
  list(): Promise<DictEntry[]>
  /**
   * Учесть использование значений собранной ссылки.
   *
   * ⚠️ Вызывается **внутри** `HistoryPort.add`, отдельной ручки в интерфейсе
   * нет. Реализация `add`, которая просто пишет строку и не трогает справочник,
   * ничего не сломает и ничего не сообщит — просто справочник останется пустым,
   * а вместе с ним и детектор расщеплений, ради которого делалась 3.0.
   */
  track(params: UtmParams): Promise<void>
  merge(kind: DictKind, alias: string, canonical: string): Promise<void>
  /** Убрать значение из справочника. Историю не трогает: там оно уже уехало в отчёты. */
  remove(kind: DictKind, value: string): Promise<void>
}

/**
 * Настройки интерфейса.
 *
 * ⚠️ **В вебе намеренно не реализован**, и в первой версии десктопа тоже: обе
 * оболочки держат настройки в `localStorage` пятью ключами (`utmka.theme`,
 * `utmka.mode`, `utmka.view.history`, `utmka.view.templates`,
 * `utmka.onboarding.v2`), каждый своим хуком на `useSyncExternalStore` с
 * синхронным чтением — этого требует бутстрап темы в `<head>`.
 *
 * Порт оставлен не как мёртвая абстракция, а как заявка: таблица `settings`
 * заведена в схеме SQLite с самого начала, чтобы вторым заходом включить
 * реализацию без миграции (ARCHITECTURE §11, 2026-08-13).
 */
export interface SettingsPort {
  read(): Promise<Settings>
  write(patch: Partial<Settings>): Promise<Settings>
}

export interface UtmkaRepository {
  templates: TemplatesPort
  history: HistoryPort
  dictionary: DictionaryPort
  settings: SettingsPort
}

/** Потолок хранения — тот же, что в 2.2. */
export const HISTORY_LIMIT = 500
export const TEMPLATES_LIMIT = 500
