/**
 * Типовые значения полей — подсказки для новичка.
 *
 * Живут в ядре, а не в интерфейсе: тот же список нужен десктопу, и он должен
 * совпадать со значениями пресетов площадок, иначе подсказка будет советовать
 * одно, а плитка подставлять другое.
 */

import type { UtmKey } from './types'

export interface ValueHint {
  value: string
  /** Когда это ставят. Короткая строка для выпадающей подсказки. */
  when: string
}

export const VALUE_HINTS: Record<UtmKey, readonly ValueHint[]> = {
  source: [
    { value: 'yandex', when: 'Яндекс.Директ, поиск и РСЯ' },
    { value: 'vk', when: 'ВКонтакте: посты и таргет' },
    { value: 'telegram', when: 'Telegram: канал или Ads' },
    { value: 'email', when: 'письма по базе' },
    { value: 'dzen', when: 'Дзен: статьи и канал' },
    { value: 'google', when: 'Google Ads' },
    { value: 'avito', when: 'объявления на Авито' },
    { value: 'offline', when: 'листовки, витрины, QR-коды' },
  ],
  medium: [
    { value: 'cpc', when: 'платная реклама, оплата за клик' },
    { value: 'social', when: 'бесплатный пост в соцсети' },
    { value: 'email', when: 'рассылка' },
    { value: 'cpm', when: 'оплата за показы' },
    { value: 'banner', when: 'медийные баннеры' },
    { value: 'qr', when: 'QR-код в офлайне' },
    { value: 'referral', when: 'переход с чужого сайта без оплаты' },
  ],
  campaign: [
    { value: 'osenniy_nabor', when: 'название запуска латиницей' },
    { value: 'probnyy_urok', when: 'акция или продукт' },
    { value: 'black_friday_2026', when: 'сезонная кампания с годом' },
  ],
  content: [
    { value: '{ad_id}', when: 'Директ подставит номер объявления' },
    { value: 'banner_1', when: 'какой именно креатив' },
    { value: 'link_bottom', when: 'место ссылки в письме или посте' },
  ],
  term: [
    { value: '{keyword}', when: 'Директ подставит поисковую фразу' },
    { value: 'kursy_angliyskogo', when: 'ключевая фраза вручную' },
  ],
}

/** Пример значения для placeholder — первый из подсказок. */
export function placeholderFor(field: UtmKey): string {
  return VALUE_HINTS[field][0]?.value ?? ''
}

/**
 * Дописать дату к значению — как date-picker в 2.2: дата **добавляется**
 * через `_`, а не заменяет набранное. Повторное добавление той же даты
 * игнорируется.
 */
export function appendDate(value: string, date: string): string {
  if (!date) return value
  if (value.includes(date)) return value
  return value ? `${value}_${date}` : date
}

/** Сегодняшняя дата в формате `YYYY-MM-DD`. Часы инжектятся — ядро без глобалей. */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
