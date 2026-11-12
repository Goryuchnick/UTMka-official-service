import { HOME, LANDINGS } from '@/lib/landings'

/**
 * Оглавление сайта для языковых моделей (llmstxt.org). Собирается из того же
 * реестра, что страницы и карта, — новая посадочная попадает сюда сама.
 */

export const dynamic = 'force-static'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://utmka.alex-pronin.ru'

export function GET(): Response {
  const lines = [
    '# UTMka',
    '',
    `> ${HOME.h1}. ${HOME.lead}`,
    '',
    'Язык — русский. Автор — Александр Пронин (https://alex-pronin.ru). Есть десктоп-версия для Windows: https://alex-pronin.ru/tools/utmka',
    '',
    '## Генератор',
    `- [${HOME.h1}](${SITE}/): одна ссылка с проверкой на ходу`,
    `- [Пакетный режим](${SITE}/batch): набор ссылок по таблице площадок, выгрузка в CSV`,
    `- [Разбор ссылки](${SITE}/parse): какие метки стоят в готовой ссылке и что из них сломает отчёт`,
    `- [Помощь](${SITE}/help): параметры, частые ошибки, пресеты площадок`,
    '',
    '## Метки по площадкам',
    ...LANDINGS.map((landing) => `- [${landing.h1}](${SITE}/${landing.slug}): ${landing.description}`),
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
