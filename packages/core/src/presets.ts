/**
 * Пресеты площадок — кнопки простого режима и подсказки расширенного.
 *
 * Живут в коде, а не в базе: они обязаны совпадать в вебе и в десктопе
 * и версионироваться вместе с правилами (ARCHITECTURE §5.2).
 *
 * Каждый пресет объясняет разницу между площадкой и типом трафика —
 * на этом путается большинство (ASSISTANT-SPEC §2.6).
 */

import { MACRO_GROUPS } from './macros'
import type { LinkDraft, Preset, PresetPlaceholder, UtmParams } from './types'
import { UTM_KEYS } from './types'

/**
 * Подстановки пресета берутся из справочника площадки, а не переписываются
 * рядом: две копии разошлись бы на первой же сверке со справкой.
 */
function fromGroup(groupId: string, tokens: readonly string[]): PresetPlaceholder[] {
  const group = MACRO_GROUPS.find((item) => item.id === groupId)
  return tokens.map((token) => {
    const macro = group?.macros.find((item) => item.token === token)
    if (!macro) throw new Error(`Подстановки ${token} нет в группе ${groupId}`)
    return { token: macro.token, meaning: macro.meaning }
  })
}

export const PRESETS: readonly Preset[] = [
  {
    id: 'yandex-direct',
    title: 'Яндекс.Директ',
    hint: 'Поиск и РСЯ — платные показы',
    params: { source: 'yandex', medium: 'cpc', term: '{keyword}', content: '{ad_id}' },
    explain:
      'Площадка — yandex, тип трафика — cpc (оплата за клик). Директ сам подставит фразу и номер объявления, если оставить подстановки в фигурных скобках.',
    placeholders: fromGroup('yandex-direct', [
      '{keyword}',
      '{ad_id}',
      '{campaign_id}',
      '{source_type}',
      '{device_type}',
      '{region_name}',
    ]),
    caveat:
      'Подстановки срабатывают в ссылках, которые проходят через Директ: ссылка объявления, быстрые ссылки, кнопка. В ЕПК метки можно задать один раз в блоке «Параметры URL» — он перекрывает такие же метки в ссылке объявления. Скопируете ссылку в пост — в отчёт приедет литерал {keyword}.',
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
      'vk — площадка, cpc — платный трафик. Для обычного поста в сообществе тип другой: social, а не cpc. Сама VK по умолчанию пишет в источник vk_ads — мы ставим vk, чтобы реклама и посты сходились в одном источнике, а различал их тип трафика. Подстановки VK Рекламы пишутся двойными скобками.',
    placeholders: fromGroup('vk-ads', [
      '{{ad_plan_id}}',
      '{{campaign_id}}',
      '{{banner_id}}',
      '{{ad_plan_name}}',
      '{{campaign_name}}',
    ]),
    caveat:
      'По умолчанию VK сама добавляет свои метки, и они главнее меток в ссылке объявления. Чтобы сработали эти, на шаге «Группы объявлений» в «Параметрах URL» выберите «Добавлять UTM-метки вручную» и вставьте строку туда. Ловушка кабинета: {{campaign_id}} — это номер ГРУППЫ объявлений, а номер кампании даёт {{ad_plan_id}}.',
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
    id: 'avito-ads',
    title: 'Авито Реклама',
    hint: 'Реклама в кабинете Авито',
    params: {
      source: 'avito-ads',
      medium: '{price_model}',
      campaign: '{campaign_id}',
      content: '{ad_id}',
      term: '{adgroup_id}',
    },
    explain:
      'Так размечать советует сама Авито: источник avito-ads, а тип трафика площадка подставит по модели оплаты — cpc или cpm. Подстановки пишутся строчными буквами в одинарных скобках.',
    placeholders: fromGroup('avito-ads', ['{price_model}', '{campaign_id}', '{adgroup_id}', '{ad_id}']),
    caveat:
      'Ссылку с тремя и больше редиректами модерация отклонит — ведите прямо на страницу. Справка Авито советует ещё utm_referrer=avito-ads: его можно дописать к адресу вручную.',
  },
  {
    id: 'telegram-channel',
    title: 'Telegram-канал',
    hint: 'Пост в своём или закупленном канале',
    params: { source: 'telegram', medium: 'messenger' },
    explain:
      'Источник — telegram, всегда одним написанием: не tg и не t_me. Три написания — три строки в отчёте, которые не сложатся. Тип трафика — messenger: так Яндекс Метрика советует размечать переходы из мессенджеров.',
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
    id: 'max-channel',
    title: 'MAX-канал',
    hint: 'Пост в своём или закупленном канале MAX',
    params: { source: 'max', medium: 'messenger' },
    explain:
      'Источник — max, тип трафика — messenger: так Яндекс Метрика советует размечать мессенджеры, а сам MAX она пока не распознаёт. С меткой переход не потеряется среди прочих.',
    caveat:
      'Рекламу в MAX продают через Директ — для неё берите пресет Директа: его подстановки работают и там.',
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
      'Дзен — площадка, тип трафика social: это ваш канал и статьи без оплаты за показы.',
    caveat:
      'Платное продвижение статей теперь идёт через Яндекс ПромоСтраницы, и они размечают ссылки сами (utm_source=yandex.promopages). Метки, вписанные руками до подключения публикации к кампании, площадка заменит своими.',
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
