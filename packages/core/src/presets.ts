/**
 * Пресеты площадок — кнопки простого режима и подсказки расширенного.
 *
 * Живут в коде, а не в базе: они обязаны совпадать в вебе и в десктопе
 * и версионироваться вместе с правилами (ARCHITECTURE §5.2).
 *
 * Каждый пресет объясняет разницу между площадкой и типом трафика —
 * на этом путается большинство (ASSISTANT-SPEC §2.6).
 */

import type { LinkDraft, Preset, UtmParams } from './types'
import { UTM_KEYS } from './types'

export const PRESETS: readonly Preset[] = [
  {
    id: 'yandex-direct',
    title: 'Яндекс.Директ',
    hint: 'Поиск и РСЯ — платные показы',
    params: { source: 'yandex', medium: 'cpc', term: '{keyword}', content: '{ad_id}' },
    explain:
      'Площадка — yandex, тип трафика — cpc (оплата за клик). Директ сам подставит фразу и номер объявления, если оставить подстановки в фигурных скобках.',
    placeholders: [
      { token: '{keyword}', meaning: 'фраза, по которой показалось объявление' },
      { token: '{ad_id}', meaning: 'номер объявления' },
      { token: '{campaign_id}', meaning: 'номер кампании' },
      { token: '{source_type}', meaning: 'тип площадки: search или context' },
      { token: '{device_type}', meaning: 'устройство: desktop, mobile, tablet' },
      { token: '{region_name}', meaning: 'регион показа' },
    ],
    caveat:
      'Подстановки работают только в ссылке самого объявления. Если скопировать её в отображаемую ссылку или в текст поста, в отчёт приедет литерал {keyword}.',
  },
  {
    /* ⚠️ Скобки двойные, и это не опечатка. Старый кабинет `vk.com/ads` читал
       одинарные (`{campaign_id}`), но VK свернул его в VK Рекламу, а та
       понимает только `{{…}}`. Одинарная скобка ссылку не ломает — она
       открывается, и в отчёт приезжает буквальный текст `{campaign_id}`
       вместо номера, то есть ошибка видна только через месяц в отчёте. */
    id: 'vk-ads',
    title: 'ВК Реклама',
    hint: 'Таргет в кабинете VK Ads',
    params: { source: 'vk', medium: 'cpc', campaign: '{{ad_plan_id}}', content: '{{banner_id}}' },
    explain:
      'vk — площадка, cpc — платный трафик. Для обычного поста в сообществе тип другой: social, а не cpc. Подстановки VK Рекламы пишутся двойными скобками.',
    placeholders: [
      { token: '{{ad_plan_id}}', meaning: 'номер кампании — верхний уровень' },
      { token: '{{campaign_id}}', meaning: 'номер ГРУППЫ объявлений, не кампании' },
      { token: '{{banner_id}}', meaning: 'номер объявления' },
      { token: '{{ad_plan_name}}', meaning: 'название кампании' },
      { token: '{{campaign_name}}', meaning: 'название группы объявлений' },
    ],
    caveat:
      'Ловушка кабинета: {{campaign_id}} — это номер ГРУППЫ объявлений, а не кампании. Номер кампании даёт {{ad_plan_id}} — иначе в отчёте сведётся не тот уровень.',
  },
  {
    id: 'vk-post',
    title: 'Пост во ВКонтакте',
    hint: 'Своё сообщество, без оплаты за показы',
    params: { source: 'vk', medium: 'social' },
    explain:
      'Тот же vk в источнике, но тип трафика social — это бесплатный пост, а не реклама. Если поставить cpc, в отчёте пост смешается с таргетом и посчитать эффективность рекламы будет нечем.',
  },
  {
    id: 'telegram-channel',
    title: 'Telegram-канал',
    hint: 'Пост в своём или закупленном канале',
    params: { source: 'telegram', medium: 'social' },
    explain:
      'Пишите источник одинаково всегда: telegram, а не tg и не messenger. Три написания — три строки в отчёте, которые не сложатся.',
  },
  {
    id: 'telegram-ads',
    title: 'Telegram Ads',
    hint: 'Официальный рекламный кабинет',
    params: { source: 'telegram', medium: 'cpc' },
    explain: 'Площадка та же, тип трафика — cpc: за показы платят.',
    caveat:
      'Динамических подстановок у Telegram Ads нет — кампанию и креатив придётся размечать вручную, своими словами.',
  },
  {
    id: 'email',
    title: 'Email-рассылка',
    hint: 'Письмо по базе',
    params: { source: 'email', medium: 'email' },
    explain:
      'Источник и тип трафика здесь совпадают — это нормально. Различать письма удобнее через кампанию: digest_09, welcome_2 и так далее.',
    caveat:
      'В рассылочном сервисе свои подстановки (например, номер письма) — они пишутся синтаксисом сервиса, а не фигурными скобками Директа.',
  },
  {
    id: 'dzen',
    title: 'Дзен',
    hint: 'Статья или канал в Дзене',
    params: { source: 'dzen', medium: 'social' },
    explain:
      'Дзен — площадка, тип трафика social. Если это промо-статья с оплатой за показы, ставьте cpc.',
  },
  {
    id: 'offline-qr',
    title: 'QR-код и офлайн',
    hint: 'Листовки, витрины, визитки, упаковка',
    params: { source: 'offline', medium: 'qr' },
    explain:
      'В офлайне «источник» — это носитель. Уточняйте его в кампании: flyer_sept, vitrina_arbat. Иначе через полгода не вспомните, какой из QR-кодов сработал.',
  },
] as const

/** Найти пресет по id. */
export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id)
}

/**
 * Применить пресет к черновику.
 *
 * Поля, которые пользователь уже заполнил руками, по умолчанию сохраняются:
 * человек выбирает площадку после того, как придумал название кампании, и
 * терять это название при нажатии на плитку — обидно.
 */
export function applyPreset(
  draft: LinkDraft,
  preset: Preset,
  options: { overwriteFilled?: boolean } = {},
): LinkDraft {
  const overwrite = options.overwriteFilled ?? false
  const params: UtmParams = { ...draft.params }

  for (const key of UTM_KEYS) {
    const incoming = preset.params[key]
    if (incoming === undefined) continue
    const current = (params[key] ?? '').trim()
    if (current && !overwrite) continue
    params[key] = incoming
  }

  return { baseUrl: draft.baseUrl, params }
}

/** Похоже ли, что черновик собран этим пресетом (подсветка активной плитки). */
export function matchPreset(params: UtmParams): Preset | undefined {
  return PRESETS.find((preset) => {
    const source = (preset.params.source ?? '').toLowerCase()
    const medium = (preset.params.medium ?? '').toLowerCase()
    return (
      source === (params.source ?? '').trim().toLowerCase() &&
      medium === (params.medium ?? '').trim().toLowerCase()
    )
  })
}

/** Все подстановки всех пресетов — для подсказок и валидатора. */
export function allPlaceholders(): Array<{ token: string; meaning: string; presetId: string }> {
  return PRESETS.flatMap((preset) =>
    (preset.placeholders ?? []).map((placeholder) => ({ ...placeholder, presetId: preset.id })),
  )
}
