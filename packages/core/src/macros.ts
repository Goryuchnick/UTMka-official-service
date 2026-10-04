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
 * Источники — официальные справки площадок, сверено 2026-10-04: что и где
 * расходилось, разобрано в docs/MACROS-AUDIT.md. Списки токенов — дословно по
 * справкам, а не по памяти: Директ, VK и Авито меняют их без анонсов.
 */

import type { UtmKey } from './types'

/**
 * Подстановка любой площадки внутри значения: `{keyword}` Директа и Google,
 * `{{ad_plan_id}}` VK Рекламы, `{{campaign.name}}` Meta, `{yandex.promopages}`
 * ПромоСтраниц. Одна регулярка на ядро и экраны: нормализация, валидатор и
 * подсветка обязаны видеть одно и то же. Когда их было три, «Привести в
 * порядок» срезало внешнюю пару скобок у `{{…}}`, и VK получал литерал.
 *
 * Флаг `g` — только для `replace` и `matchAll`: `test` у глобальной регулярки
 * помнит позицию и через раз отвечает неверно.
 */
export const PLACEHOLDER_RE = /\{\{[a-z_0-9.]+\}\}|\{[a-z_0-9.]+\}/gi

/** Имя подстановки без скобок, в нижнем регистре: `{{Ad_Plan_Id}}` → `ad_plan_id`. */
export function placeholderName(token: string): string {
  return token.replace(/[{}]/g, '').toLowerCase()
}

/**
 * Значения, которые площадки и сервисы рассылок ставят в метки сами. Их
 * написание — не наше дело: если нормализация перепишет ручную ссылку в
 * `avito_ads`, а площадка пришлёт `avito-ads`, отчёт разведёт один источник
 * на две строки. Поэтому эти значения «Привести в порядок» не трогает, а
 * валидатор не ругается на их регистр и знаки.
 *
 * Источники — справки площадок, сверено 2026-10-04 (docs/MACROS-AUDIT.md).
 */
export const PLATFORM_LITERALS: ReadonlySet<string> = new Set([
  'vk_ads', // VK Реклама по умолчанию ставит utm_source=vk_ads
  'yandex.promopages', // ПромоСтраницы размечают переходы сами
  'avito-ads', // Авито Реклама советует utm_source=avito-ads
  'Unisender', // Unisender ставит utm_source=Unisender, если не отключить
])

/** Значение целиком — метка, которую площадка пишет сама. */
export function isPlatformLiteral(value: string): boolean {
  return PLATFORM_LITERALS.has(value.trim())
}

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
      'Метки и подстановки Директ добавляет к ссылке объявления, быстрым ссылкам и кнопке. В ЕПК общие метки задают в блоке «Параметры URL» кампании, группы или объявления: объявление приоритетнее группы, группа — кампании, а значение из блока перекрывает такой же параметр в ссылке объявления. В быстрых ссылках {campaign_id}, {ad_id}, {banner_id} и {phrase_id} гарантированы, только если те же параметры есть в ссылке самого объявления. {campaign_name} и {region_name} приезжают кириллицей — в отчёте это процентная кодировка; для названия кампании берите {campaign_name_lat}. Директ сам добавляет yclid, а utm_source=yandex при клике может сократить до ya.',
    macros: [
      { token: '{campaign_id}', meaning: 'номер кампании', fields: ['campaign', 'content'] },
      { token: '{campaign_name_lat}', meaning: 'название кампании латиницей, до 255 знаков', fields: ['campaign'] },
      { token: '{campaign_name}', meaning: 'название кампании, до 255 знаков', fields: ['campaign'] },
      {
        token: '{campaign_type}',
        meaning: 'тип кампании: type1 — ЕПК, type6 — баннер на поиске; type2, type3, type4 больше не поддерживаются',
      },
      { token: '{gbid}', meaning: 'номер группы объявлений', fields: ['content'] },
      { token: '{ad_id}', meaning: 'номер объявления', fields: ['content'] },
      { token: '{banner_id}', meaning: 'номер объявления — второе имя {ad_id}', fields: ['content'] },
      { token: '{creative_id}', meaning: 'номер креатива из конструктора', fields: ['content'] },
      {
        token: '{keyword}',
        meaning: 'фраза, по которой показалось объявление, без минус-слов; в ЕПК — комбинаторная',
        fields: ['term'],
      },
      {
        token: '{matched_keyword}',
        meaning: 'подобранная фраза или семантическое соответствие; ставят вместе с {match_type}',
        fields: ['term'],
      },
      {
        token: '{phrase_id}',
        meaning: 'номер ключевой фразы; только комбинаторные объявления ЕПК и продвижение приложений',
        fields: ['term'],
      },
      { token: '{match_type}', meaning: 'тип соответствия: rm — автотаргетинг, syn — семантическое соответствие' },
      { token: '{source_type}', meaning: 'тип площадки: search — поиск, context — сети' },
      {
        token: '{source}',
        meaning: 'место показа: домен площадки в сетях, none на поиске Яндекса; в РСЯ на поиске бывает и домен, и none',
      },
      { token: '{device_type}', meaning: 'устройство: desktop, mobile, tablet' },
      { token: '{region_id}', meaning: 'номер региона показа' },
      { token: '{region_name}', meaning: 'название региона показа' },
      {
        token: '{position_type}',
        meaning: 'блок на поиске: premium, dynamic_places, other — справа или внизу; none — показ в сетях',
        fields: ['content'],
      },
      { token: '{position}', meaning: 'позиция в блоке, в сетях 0; ставят вместе с {position_type}', fields: ['content'] },
      { token: '{retargeting_id}', meaning: 'номер условия нацеливания на аудиторию' },
      { token: '{adtarget_id}', meaning: 'номер условия нацеливания' },
      { token: '{coef_goal_context_id}', meaning: 'номер корректировки ставок для ретаргетинга и подбора аудитории' },
      { token: '{yclid}', meaning: 'номер клика по объявлению; сам yclid Директ добавляет в ссылку и без этого' },
    ],
  },
  {
    id: 'vk-ads',
    title: 'VK Реклама',
    syntax: '{{макрос}}',
    sources: ['vk', 'vkontakte', 'vk_ads', 'vkads', 'mytarget'],
    caveat:
      'Скобки двойные — одинарные VK не понимает. Главная ловушка: {{campaign_id}} подставляет номер ГРУППЫ объявлений, а номер самой кампании даёт {{ad_plan_id}}. По умолчанию VK сама добавляет utm_medium=cpc&utm_source=vk_ads&utm_campaign={{campaign_id}}&utm_content={{banner_id}}, а «Параметры URL» группы приоритетнее разметки в ссылке объявления. Чтобы сработали ваши метки, на шаге «Группы объявлений» выберите «Добавлять UTM-метки вручную» и вставьте строку туда, а в объявлении оставьте ссылку без меток.',
    macros: [
      { token: '{{ad_plan_id}}', meaning: 'номер кампании — верхний уровень', fields: ['campaign'] },
      { token: '{{ad_plan_name}}', meaning: 'название кампании', fields: ['campaign'] },
      {
        token: '{{campaign_id}}',
        meaning: 'номер ГРУППЫ объявлений, не кампании',
        fields: ['campaign', 'content'],
      },
      { token: '{{ad_group_id}}', meaning: 'номер группы объявлений — второе имя {{campaign_id}}' },
      { token: '{{campaign_name}}', meaning: 'название группы объявлений, не кампании' },
      { token: '{{ad_group_name}}', meaning: 'название группы объявлений — второе имя {{campaign_name}}' },
      { token: '{{banner_id}}', meaning: 'номер объявления (баннера)', fields: ['content'] },
      { token: '{{advertiser_id}}', meaning: 'номер рекламодателя' },
      { token: '{{search_phrase}}', meaning: 'поисковая фраза пользователя; только сайты и каталоги', fields: ['term'] },
      { token: '{{geo}}', meaning: 'номер региона, откуда пришёл переход', fields: ['term'] },
      { token: '{{gender}}', meaning: 'пол пользователя, сделавшего переход', fields: ['term'] },
      { token: '{{age}}', meaning: 'возраст пользователя, сделавшего переход', fields: ['term'] },
      { token: '{{impression_weekday}}', meaning: 'день недели показа: mon, tue, sat; не для мини-приложений' },
      {
        token: '{{impression_hour}}',
        meaning: 'час показа по Москве, 24-часовой формат: 01, 11, 22; не для мини-приложений',
      },
      { token: '{{user_timezone}}', meaning: 'часовой пояс пользователя, например +3; не для мини-приложений' },
      {
        token: '{{random}}',
        meaning: 'случайное число для точного подсчёта показов в пикселях; не для мини-приложений',
      },
      { token: '{{lead_form_id}}', meaning: 'номер лид-формы; только для лид-форм' },
      { token: '{{lead_form_name}}', meaning: 'название лид-формы; только для лид-форм' },
    ],
  },
  {
    id: 'avito-ads',
    title: 'Авито Реклама',
    syntax: '{макрос}',
    sources: ['avito-ads', 'avito_ads', 'avito'],
    caveat:
      'Подстановки пишутся в одинарных скобках и строчными буквами. Справка советует utm_source=avito-ads, utm_medium={price_model}, utm_campaign={campaign_id}, utm_term={adgroup_id}, utm_content={ad_id} и ещё utm_referrer=avito-ads. Макрос, которого кабинет не знает, не подменится, хотя ссылку использовать можно. Ссылку с тремя и больше редиректами модерация отклонит — ведите на страницу напрямую.',
    macros: [
      { token: '{campaign_id}', meaning: 'номер рекламной кампании', fields: ['campaign'] },
      { token: '{adgroup_id}', meaning: 'номер группы кампании, 11 цифр', fields: ['term'] },
      { token: '{ad_id}', meaning: 'номер креатива, 13 цифр', fields: ['content'] },
      { token: '{banner_id}', meaning: 'номер креатива — второе имя {ad_id}', fields: ['content'] },
      { token: '{price_model}', meaning: 'модель оплаты: cpc или cpm', fields: ['medium'] },
      { token: '{campaign_type}', meaning: 'тип кампании: html, video, textimage' },
      { token: '{account_id}', meaning: 'номер рекламного аккаунта, 9 цифр' },
      { token: '{advertiser_id}', meaning: 'номер рекламодателя' },
      { token: '{erid}', meaning: 'токен маркировки erid из ОРД' },
      { token: '{rnd}', meaning: 'случайное число, создаётся в момент показа' },
      { token: '{impression_id}', meaning: 'уникальное значение, создаётся при показе' },
      { token: '{click_id}', meaning: 'уникальное значение, создаётся при клике' },
      { token: '{fullview_id}', meaning: 'уникальное значение, создаётся при полном просмотре видео' },
    ],
  },
  {
    id: 'yandex-promopages',
    title: 'Яндекс ПромоСтраницы',
    syntax: '{макрос}',
    sources: ['yandex.promopages', 'yandex_promopages', 'promopages'],
    caveat:
      'Когда публикацию подключают к кампании, ПромоСтраницы сами размечают все её ссылки и Scroll2Site: utm_source={yandex.promopages}, utm_medium={publication_type}, utm_campaign={campaign}, utm_content={title}, utm_term={link_name}. Метки, вписанные до подключения, заменяются. Свои задают уже после — прямо в статьях или в кабинете: кампания → «UTM-метки» → «Изм.», изменения идут на все публикации кампании. Яндекс советует оставлять автоматические макросы.',
    macros: [
      { token: '{yandex.promopages}', meaning: 'источник перехода: люди пришли с ПромоСтраниц', fields: ['source'] },
      { token: '{publication_type}', meaning: 'тип публикации — он же тип трафика', fields: ['medium'] },
      { token: '{campaign}', meaning: 'название кампании на русском', fields: ['campaign'] },
      { token: '{campaign_name}', meaning: 'название кампании на русском — второе имя {campaign}', fields: ['campaign'] },
      { token: '{campaign_eng}', meaning: 'название кампании латиницей (транслит)', fields: ['campaign'] },
      { token: '{title}', meaning: 'заголовок публикации на русском, первые 50 знаков', fields: ['content'] },
      { token: '{title_eng}', meaning: 'заголовок публикации латиницей (транслит), первые 50 знаков', fields: ['content'] },
      {
        token: '{link_name}',
        meaning: 'откуда клик: scroll2site, feedback, click_through или первые 50 знаков текста ссылки в статье',
        fields: ['term'],
      },
      {
        token: '{preview_id}',
        meaning: 'номер обложки: id публикации с уточнением _X_Y для картинок и _X_Y_Z для видео',
        fields: ['term'],
      },
      { token: '{campaign_id}', meaning: 'номер кампании', fields: ['campaign'] },
      { token: '{id}', meaning: 'номер публикации', fields: ['content'] },
      { token: '{interest}', meaning: 'ответ на «Заинтересовались?»: interested, uninterested, unrated' },
      { token: '{keyword}', meaning: 'фраза, по которой показалось объявление', fields: ['term'] },
      { token: '{region_name}', meaning: 'регион показа' },
      { token: '{device_type}', meaning: 'устройство показа: desktop, mobile, tablet' },
      { token: '{google_aid}', meaning: 'идентификатор Google-устройства' },
      { token: '{gaid}', meaning: 'идентификатор Google-устройства — второе имя {google_aid}' },
      { token: '{ios_ifa}', meaning: 'идентификатор iOS-устройства' },
      { token: '{idfa}', meaning: 'идентификатор iOS-устройства — второе имя {ios_ifa}' },
      { token: '{logid}', meaning: 'номер клика или перехода' },
      { token: '{rand}', meaning: 'случайное число — уменьшает расхождения со сторонними системами' },
    ],
  },
  {
    id: 'max',
    title: 'MAX',
    syntax: '—',
    sources: ['max', 'maks'],
    caveat:
      'У MAX своих подстановок нет. Реклама в нём идёт через Директ: метки и подстановки Директа задают в блоке «Параметры URL» кампании ЕПК, и для такой ссылки берите пресет Директа. Что придёт в {source} из каналов MAX, справка Директа не говорит.',
    macros: [],
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
      {
        token: '{keyword}',
        meaning: 'в поиске — ключевое слово аккаунта, совпавшее с запросом; в КМС — совпавшее с содержимым; пусто при AI Max, DSA и Performance Max',
        fields: ['term'],
      },
      { token: '{matchtype}', meaning: 'тип соответствия: e — точное, p — фразовое, b — широкое, a — AI Max без ключевых слов' },
      { token: '{device}', meaning: 'устройство: m — телефон, t — планшет, c — компьютер' },
      {
        token: '{network}',
        meaning: 'откуда клик: g — поиск Google, s — поисковые партнёры, d — КМС, ytv — YouTube, vp — видеопартнёры Google, gtv — Google TV, x — Performance Max, e — кампании приложений на вовлечение',
      },
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
  return MACRO_GROUPS.flatMap((group) => group.macros.map((macro) => placeholderName(macro.token)))
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
