/**
 * Справочник системных подстановок рекламных площадок.
 *
 * Подстановка (макрос) — это токен в фигурных скобках, который площадка сама
 * заменяет на реальные данные в момент клика: номер кампании, номер объявления,
 * поисковую фразу. Написать их руками нельзя — они и существуют ровно затем,
 * чтобы не размечать каждое объявление вручную.
 *
 * Справочник живёт в ядре, а не в интерфейсе, по трём причинам:
 * - он нужен и вебу, и десктопу, и должен совпадать до символа;
 * - из него же собирается словарь известных токенов для валидатора
 *   (`KNOWN_PLACEHOLDERS` в `validate.ts`) — иначе подсказка советовала бы
 *   макрос, на который сама же ругается «неизвестная подстановка»;
 * - синтаксис у площадок разный, и это главный источник ошибок: Директ читает
 *   `{campaign_id}`, VK Реклама — `{{ad_plan_id}}`, Google Ads — `{campaignid}`
 *   без подчёркиваний, Meta — `{{campaign.name}}` через точку. Перепутанный
 *   синтаксис ссылку не ломает: она открывается, а в отчёт приезжает литерал.
 *
 * Источники — официальные справки площадок, сверено 2026-08-20.
 */

import type { UtmKey } from './types'

export interface Macro {
  /** Как пишется в поле — со скобками, как есть. */
  token: string
  /** Что подставит площадка. */
  meaning: string
  /** Поля, куда это ставят обычно. Пусто — годится в любое. */
  fields?: readonly UtmKey[]
}

export interface MacroGroup {
  id: string
  /** Название площадки — заголовок группы. */
  title: string
  /** Как выглядит синтаксис у этой площадки. Строка для шапки группы. */
  syntax: string
  /** Значения `utm_source`, по которым группа считается «своей». */
  sources: readonly string[]
  macros: readonly Macro[]
  /** Что нужно знать до вставки. Показывается над списком. */
  caveat?: string
}

export const MACRO_GROUPS: readonly MacroGroup[] = [
  {
    id: 'yandex-direct',
    title: 'Яндекс.Директ',
    syntax: '{макрос}',
    sources: ['yandex', 'yandex_direct', 'direct', 'ya', 'yandex-direct'],
    caveat:
      'Подстановки работают только в ссылке самого объявления. {campaign_name} и {region_name} приезжают кириллицей — в отчёте это процентная кодировка; для названия кампании берите {campaign_name_lat}.',
    macros: [
      { token: '{campaign_id}', meaning: 'номер кампании', fields: ['campaign', 'content'] },
      { token: '{campaign_name_lat}', meaning: 'название кампании латиницей', fields: ['campaign'] },
      { token: '{campaign_name}', meaning: 'название кампании как в кабинете', fields: ['campaign'] },
      { token: '{campaign_type}', meaning: 'тип кампании: type1 — ЕПК, type6 — баннер на поиске' },
      { token: '{gbid}', meaning: 'номер группы объявлений', fields: ['content'] },
      { token: '{ad_id}', meaning: 'номер объявления', fields: ['content'] },
      { token: '{banner_id}', meaning: 'номер объявления — второе имя {ad_id}', fields: ['content'] },
      { token: '{creative_id}', meaning: 'номер креатива из конструктора', fields: ['content'] },
      { token: '{keyword}', meaning: 'фраза, по которой показалось объявление', fields: ['term'] },
      { token: '{matched_keyword}', meaning: 'фраза, подобранная автотаргетингом', fields: ['term'] },
      { token: '{phrase_id}', meaning: 'номер ключевой фразы', fields: ['term'] },
      { token: '{match_type}', meaning: 'тип соответствия: rm — автотаргетинг, syn — синоним' },
      { token: '{source_type}', meaning: 'тип площадки: search или context' },
      { token: '{source}', meaning: 'домен площадки сети; на поиске Яндекса — none' },
      { token: '{device_type}', meaning: 'устройство: desktop, mobile, tablet' },
      { token: '{region_id}', meaning: 'номер региона показа' },
      { token: '{region_name}', meaning: 'регион показа словом' },
      { token: '{position_type}', meaning: 'блок на поиске: premium, other' },
      { token: '{position}', meaning: 'позиция в блоке; в сетях всегда 0' },
      { token: '{retargeting_id}', meaning: 'номер условия ретаргетинга' },
      { token: '{adtarget_id}', meaning: 'номер условия нацеливания динамических объявлений' },
      { token: '{adtarget_name}', meaning: 'условие нацеливания словом' },
      { token: '{addphrases}', meaning: 'показ по дополнительным фразам: yes или no' },
      { token: '{coef_goal_context_id}', meaning: 'номер корректировки ставок' },
    ],
  },
  {
    id: 'vk-ads',
    title: 'VK Реклама',
    syntax: '{{макрос}}',
    sources: ['vk', 'vkontakte', 'vk_ads', 'vkads', 'mytarget'],
    caveat:
      'Скобки двойные — одинарные VK не понимает. Главная ловушка: {{campaign_id}} подставляет номер ГРУППЫ объявлений, а номер самой кампании даёт {{ad_plan_id}}. Перепутать — значит свести в отчёте не тот уровень.',
    macros: [
      { token: '{{ad_plan_id}}', meaning: 'номер кампании — верхний уровень', fields: ['campaign'] },
      { token: '{{ad_plan_name}}', meaning: 'название кампании', fields: ['campaign'] },
      {
        token: '{{campaign_id}}',
        meaning: 'номер ГРУППЫ объявлений, не кампании',
        fields: ['campaign', 'content'],
      },
      { token: '{{campaign_name}}', meaning: 'название группы объявлений' },
      { token: '{{banner_id}}', meaning: 'номер объявления', fields: ['content'] },
      { token: '{{advertiser_id}}', meaning: 'номер рекламодателя' },
      { token: '{{search_phrase}}', meaning: 'поисковая фраза перехода', fields: ['term'] },
      { token: '{{geo}}', meaning: 'номер региона по геодереву VK' },
      { token: '{{gender}}', meaning: 'пол: male или female' },
      { token: '{{age}}', meaning: 'возраст' },
      { token: '{{impression_weekday}}', meaning: 'день недели показа' },
      { token: '{{impression_hour}}', meaning: 'час показа по Москве' },
      { token: '{{user_timezone}}', meaning: 'часовой пояс пользователя' },
      { token: '{{random}}', meaning: 'случайное число — против кеширования' },
    ],
  },
  {
    id: 'google-ads',
    title: 'Google Ads',
    syntax: '{макрос}',
    sources: ['google', 'google_ads', 'adwords', 'gads'],
    caveat:
      'ValueTrack пишется без подчёркиваний: {campaignid}, а не {campaign_id}. Подстановки Директа Google не понимает, и наоборот — в отчёт приедет текст скобок.',
    macros: [
      { token: '{campaignid}', meaning: 'номер кампании', fields: ['campaign', 'content'] },
      { token: '{adgroupid}', meaning: 'номер группы объявлений', fields: ['content'] },
      { token: '{creative}', meaning: 'номер объявления', fields: ['content'] },
      { token: '{keyword}', meaning: 'ключевое слово или таргетинг площадки', fields: ['term'] },
      { token: '{matchtype}', meaning: 'тип соответствия: e, p, b' },
      { token: '{device}', meaning: 'устройство: m — телефон, t — планшет, c — компьютер' },
      { token: '{network}', meaning: 'сеть: g — поиск Google, s — партнёры, d — КМС' },
      { token: '{targetid}', meaning: 'номер ключевого слова или аудитории' },
      { token: '{placement}', meaning: 'площадка КМС, где кликнули' },
      { token: '{loc_physical_ms}', meaning: 'номер местоположения пользователя' },
    ],
  },
  {
    id: 'meta-ads',
    title: 'Meta Ads — Facebook, Instagram',
    syntax: '{{свойство}}',
    sources: ['facebook', 'fb', 'instagram', 'ig', 'meta'],
    caveat:
      'Названия фиксируются в момент публикации: переименуете кампанию — метка останется прежней, а номера ({{campaign.id}}) не меняются никогда. Meta признана в России экстремистской организацией и запрещена — эти подстановки для зарубежных кабинетов.',
    macros: [
      { token: '{{campaign.name}}', meaning: 'название кампании', fields: ['campaign'] },
      { token: '{{campaign.id}}', meaning: 'номер кампании', fields: ['campaign'] },
      { token: '{{adset.name}}', meaning: 'название группы объявлений', fields: ['term', 'content'] },
      { token: '{{adset.id}}', meaning: 'номер группы объявлений' },
      { token: '{{ad.name}}', meaning: 'название объявления', fields: ['content'] },
      { token: '{{ad.id}}', meaning: 'номер объявления', fields: ['content'] },
      { token: '{{placement}}', meaning: 'место показа: feed, stories, reels' },
      { token: '{{site_source_name}}', meaning: 'площадка: fb, ig, an, msg' },
    ],
  },
  {
    id: 'telegram-ads',
    title: 'Telegram Ads',
    syntax: '—',
    sources: ['telegram', 'tg'],
    caveat:
      'Подстановок у Telegram Ads нет вовсе: кампанию и креатив размечают руками, своими словами. Любые фигурные скобки приедут в отчёт буквально.',
    macros: [],
  },
]

/** Группа подстановок для площадки из `utm_source`. */
export function macrosForSource(source: string | undefined): MacroGroup | undefined {
  const needle = (source ?? '').trim().toLowerCase()
  if (!needle) return undefined
  return MACRO_GROUPS.find((group) => group.sources.includes(needle))
}

/** Все токены справочника без скобок — из этого собирается словарь валидатора. */
export function macroTokenNames(): string[] {
  return MACRO_GROUPS.flatMap((group) =>
    group.macros.map((macro) => macro.token.replace(/[{}]/g, '').toLowerCase()),
  )
}

/**
 * Дописать подстановку к значению — тем же правилом, что и дату
 * (`appendDate` в `hints.ts`): **добавляем**, а не затираем набранное. Человек
 * сначала называет кампанию, потом уточняет её номером объявления, и терять
 * название при вставке макроса — то же самое, что терять его при выборе
 * площадки.
 */
export function appendMacro(value: string, token: string): string {
  if (!token) return value
  const current = (value ?? '').trim()
  if (current.includes(token)) return current
  if (!current) return token
  if (/[_\-.]$/.test(current)) return `${current}${token}`
  return `${current}_${token}`
}
