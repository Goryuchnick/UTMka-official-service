'use client'

/**
 * Помощь — встроенный раздел, а не ссылка наружу (паритет с 2.2).
 *
 * Раскладка в две колонки на широких экранах: слева объяснения, справа
 * липкий столбец с действиями — обучение, версия для компьютера, GitHub,
 * поддержка автора. Ровно тот набор, что был в помощи 2.2, плюс онбординг.
 *
 * Тексты объясняют последствие, а не формат: не «значение должно быть в нижнем
 * регистре», а «Yandex и yandex станут двумя строками в отчёте». Тот же
 * принцип, по которому написаны замечания в ядре.
 */

import { useState } from 'react'
import { PRESETS, UTM_PARAM_NAMES, type UtmKey } from '@utmka/core'

import { PixelIcon } from '@/components/PixelIcon'
import { Onboarding } from '@/components/Onboarding'
import { useSetMascotLine } from '@/lib/mascot'

const GITHUB = 'https://github.com/Goryuchnick/UTMka-official-service'
const WINDOWS_EXE = `${GITHUB}/releases/download/2.2.0/UTMka-Setup-2.2.0.exe`
const MACOS_ARM = `${GITHUB}/releases/download/2.2.1/UTMka-2.2.1-macOS-arm64.dmg`
const MACOS_INTEL = `${GITHUB}/releases/download/2.2.1/UTMka-2.2.1-macOS-x86_64.dmg`
const DONATE = 'https://alex-pronin.ru/donate'
const SITE = 'https://alex-pronin.ru/tools/utmka'
const TELEGRAM = 'https://t.me/pronin_marketing'

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
  const [tour, setTour] = useState(false)

  useSetMascotLine('Спрашивайте. Главная путаница — между источником и каналом, начнём с неё.')

  return (
    <div className="screen-scroll">
      <Onboarding open={tour} onClose={() => setTour(false)} />

      <div className="help-cols">
        {/* ─────────────── объяснения ─────────────── */}
        <div className="help-main">
          <div className="glass">
            <div className="qhead">
              <span className="qchip">
                <PixelIcon name="help" />
              </span>
              <span className="qtitle qtitle--amber">Что такое UTM</span>
            </div>
            <p className="hint">
              UTM-метки — приписка к адресу страницы, по которой аналитика понимает, откуда пришёл
              человек. Сама страница от них не меняется: всё, что после «?», нужно не сайту, а
              отчёту. Поэтому цена ошибки видна не сразу — ссылка работает, а данные врут.
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
              Плитки в простом режиме подставляют эти значения сами — здесь просто видно, что
              именно они ставят и почему.
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
              <span className="qtitle qtitle--teal">Кодовая фраза и помощник</span>
            </div>
            <p className="hint">
              Инструмент работает целиком без входа: генератор, пакет, разбор, QR и сокращатель.
              Фраза нужна только чтобы сохранять — шаблоны, историю и справочник значений. Ни
              почты, ни пароля, ни персональных данных мы не собираем: в базе лежит только
              отпечаток фразы. Обратная сторона честная — фразу нельзя восстановить.
            </p>
            <p className="explain">
              <b>Почему у помощника лимит.</b> Всё, что инструмент проверяет и чинит, — обычные
              правила: они мгновенные и ничего не стоят. А вот разобрать бриф «запускаем осенний
              набор на Директ и ВК» умеет только языковая модель, и каждый её ответ автор
              оплачивает из своего кармана. Отсюда 20 запросов в сутки на фразу. Кончились —
              инструмент работает дальше, просто без разбора текста. Платных тарифов не будет.
            </p>
          </div>
        </div>

        {/* ─────────────── действия ─────────────── */}
        <aside className="help-side">
          <div className="glass">
            <div className="qhead">
              <span className="qchip qchip--teal">
                <PixelIcon name="wand" />
              </span>
              <span className="qtitle qtitle--teal">Первый раз здесь?</span>
            </div>
            <p className="hint">Пять коротких экранов — что умеет инструмент и чем за это платят.</p>
            <button type="button" className="btn btn--main" onClick={() => setTour(true)}>
              <PixelIcon name="wand" />
              Пройти обучение
            </button>
          </div>

          <div className="glass">
            <div className="qhead">
              <span className="qchip">
                <PixelIcon name="save" />
              </span>
              <span className="qtitle qtitle--amber">Версия для компьютера</span>
            </div>
            <p className="hint">
              То же самое, но офлайн и без всякого входа: история и шаблоны лежат в файле на вашем
              диске. Ставится из релизов на GitHub.
            </p>
            <div className="help-links">
              <a className="btn btn--sm" href={WINDOWS_EXE}>
                <PixelIcon name="save" />
                Windows · 2.2.0
              </a>
              <a className="btn btn--sm" href={MACOS_ARM}>
                <PixelIcon name="save" />
                macOS · Apple Silicon
              </a>
              <a className="btn btn--sm" href={MACOS_INTEL}>
                <PixelIcon name="save" />
                macOS · Intel
              </a>
            </div>
          </div>

          <div className="glass">
            <div className="qhead">
              <span className="qchip">
                <PixelIcon name="link" />
              </span>
              <span className="qtitle qtitle--amber">Проект</span>
            </div>
            <div className="help-links">
              <a className="btn btn--sm" href={GITHUB} target="_blank" rel="noopener noreferrer">
                <PixelIcon name="code" />
                Исходники на GitHub
              </a>
              <a className="btn btn--sm" href={`${GITHUB}/issues`} target="_blank" rel="noopener noreferrer">
                <PixelIcon name="wand" />
                Нашли ошибку — напишите
              </a>
              <a className="btn btn--sm" href={SITE} target="_blank" rel="noopener noreferrer">
                <PixelIcon name="link" />
                Страница проекта
              </a>
              <a className="btn btn--sm" href={TELEGRAM} target="_blank" rel="noopener noreferrer">
                <PixelIcon name="send" />
                Telegram автора
              </a>
            </div>
          </div>

          <div className="glass">
            <div className="qhead">
              <span className="qchip qchip--magenta">
                <PixelIcon name="heart" />
              </span>
              <span className="qtitle qtitle--magenta">Поддержать</span>
            </div>
            <p className="hint">
              Инструмент бесплатный и без рекламы. Если он сэкономил вам вечер — можно сказать
              спасибо; это и оплачивает помощника.
            </p>
            <a className="btn btn--main" href={DONATE} target="_blank" rel="noopener noreferrer">
              <PixelIcon name="heart" />
              Поблагодарить автора
            </a>
            <span className="hint help-ver">UTMka 3.0 · веб</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
