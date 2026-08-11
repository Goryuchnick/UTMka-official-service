'use client'

/**
 * Помощь — встроенный раздел, а не ссылка наружу (паритет с 2.2).
 *
 * Тексты объясняют последствие, а не формат: не «значение должно быть в нижнем
 * регистре», а «Yandex и yandex станут двумя строками в отчёте». Это тот же
 * принцип, по которому написаны замечания в ядре.
 */

import { PRESETS, UTM_PARAM_NAMES, type UtmKey } from '@utmka/core'

import { PixelIcon } from '@/components/PixelIcon'
import { useSetMascotLine } from '@/lib/mascot'

const PARAMS: readonly { key: UtmKey; what: string; example: string; why: string }[] = [
  {
    key: 'source',
    what: 'Площадка, откуда пришёл человек.',
    example: 'yandex, vk, telegram, email',
    why: 'Отвечает на вопрос «где мы разместились». Пишется одинаково всегда: yandex и Yandex — для отчёта две разные площадки.',
  },
  {
    key: 'medium',
    what: 'Тип трафика, а не название площадки.',
    example: 'cpc, social, email, banner',
    why: 'Главная путаница новичков: vk — это source, а social — medium. Если поставить сюда vk, отчёт по типам трафика развалится.',
  },
  {
    key: 'campaign',
    what: 'Название запуска.',
    example: 'osenniy_nabor_2026-09',
    why: 'Единственное поле, которое вы придумываете сами. Через полгода вы должны по нему вспомнить, что это был за запуск — «test1» не вспомните.',
  },
  {
    key: 'content',
    what: 'Что именно нажали: баннер, кнопка, вариант объявления.',
    example: 'banner_1, {ad_id}, link_bottom',
    why: 'Нужен, когда на одну кампанию несколько креативов. Без него вы знаете, что кампания работает, но не знаете, какой баннер.',
  },
  {
    key: 'term',
    what: 'Ключевое слово, по которому показали объявление.',
    example: '{keyword}, kursy_angliyskogo',
    why: 'В Директе и Google Ads подставляется автоматически. Фигурные скобки так и должны доехать до площадки — она сама заменит их на запрос.',
  },
]

const MISTAKES: readonly { title: string; text: string }[] = [
  {
    title: 'Разный регистр',
    text: 'Yandex, yandex и YANDEX — три отдельные строки в отчёте. Трафик одной площадки делится на три части, и ни одна не показывает правду.',
  },
  {
    title: 'Пробелы и кириллица',
    text: 'Пробел превращается в +, русские буквы — в %D0%BA%D1%83. Ссылка работает, но в отчёте вместо «осенний набор» будет каша из процентов.',
  },
  {
    title: 'Платный трафик как органический',
    text: 'medium=organic на рекламной ссылке — и реклама смешивается с бесплатным трафиком. Дальше вы считаете окупаемость по неверной базе.',
  },
  {
    title: 'Название площадки в medium',
    text: 'medium=vk вместо medium=social. Отчёт «по типам трафика» перестаёт быть отчётом по типам: в нём оказываются названия площадок.',
  },
  {
    title: 'Закодированные подстановки',
    text: '%7Bkeyword%7D вместо {keyword}. Площадка не узнаёт свою подстановку и оставляет её как есть — в отчёте вместо запросов одинаковая строка.',
  },
]

export function HelpScreen() {
  useSetMascotLine('Спрашивайте. Главная путаница — между источником и каналом, начнём с неё.')

  return (
    <div className="screen-scroll">
      <div className="glass">
        <div className="qhead">
          <span className="qchip">
            <PixelIcon name="help" />
          </span>
          <span className="qtitle qtitle--amber">Что такое UTM</span>
        </div>
        <p className="hint">
          UTM-метки — приписка к адресу страницы, по которой аналитика понимает, откуда пришёл
          человек. Сама страница от них не меняется: всё, что после «?», нужно не сайту, а отчёту.
          Поэтому цена ошибки видна не сразу — ссылка работает, а данные врут.
        </p>
        <div className="result-url">
          <span>site.ru/page</span>
          <span className="k">?utm_source=</span>
          <span className="v">yandex</span>
          <span className="k">&amp;utm_medium=</span>
          <span className="v">cpc</span>
          <span className="k">&amp;utm_campaign=</span>
          <span className="v">osenniy_nabor</span>
        </div>
      </div>

      <div className="glass">
        <div className="qhead">
          <span className="qchip qchip--teal">5</span>
          <span className="qtitle qtitle--teal">Параметры</span>
        </div>
        {PARAMS.map((param) => (
          <div className="field" key={param.key}>
            <span className="field-label">{UTM_PARAM_NAMES[param.key]}</span>
            <p className="explain">
              <b>{param.what}</b> {param.why}
            </p>
            <span className="hint hint--examples">{param.example}</span>
          </div>
        ))}
      </div>

      <div className="glass">
        <div className="qhead">
          <span className="qchip qchip--magenta">!</span>
          <span className="qtitle qtitle--magenta">Что ломается чаще всего</span>
        </div>
        {MISTAKES.map((mistake) => (
          <div className="issue issue--info" key={mistake.title}>
            <div className="issue-title">{mistake.title}</div>
            <div className="issue-text">{mistake.text}</div>
          </div>
        ))}
      </div>

      <div className="glass">
        <div className="qhead">
          <span className="qchip">
            <PixelIcon name="grid" />
          </span>
          <span className="qtitle qtitle--amber">Площадки</span>
        </div>
        <p className="hint">
          Плитки в простом режиме подставляют эти значения сами — здесь просто видно, что именно
          они ставят и почему.
        </p>
        {PRESETS.map((preset) => (
          <div className="field" key={preset.id}>
            <span className="field-label">{preset.title}</span>
            <span className="hint hint--examples">
              {Object.entries(preset.params)
                .map(([key, value]) => `${key}=${value}`)
                .join(' · ')}
            </span>
            <p className="explain">{preset.explain}</p>
            {preset.caveat ? <p className="hint hint--error">{preset.caveat}</p> : null}
          </div>
        ))}
      </div>

      <div className="glass">
        <div className="qhead">
          <span className="qchip">
            <PixelIcon name="key" />
          </span>
          <span className="qtitle qtitle--teal">Про кодовую фразу</span>
        </div>
        <p className="hint">
          Инструмент работает целиком без входа: генератор, пакет, разбор, QR и сокращатель. Фраза
          нужна только чтобы сохранять — шаблоны, историю и справочник значений. Ни почты, ни
          пароля, ни персональных данных мы не собираем: в базе лежит только отпечаток фразы.
          Обратная сторона честная — фразу нельзя восстановить.
        </p>
      </div>
    </div>
  )
}
