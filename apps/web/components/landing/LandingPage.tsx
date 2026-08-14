/**
 * Шаблон посадочной страницы площадки.
 *
 * Серверный компонент, и это главное в нём: заголовок, объяснения и вопросы
 * уходят в HTML сразу. Генератор — клиентский остров, но тоже пререндеренный:
 * с тех пор как он перестал читать строку запроса хуком, форма попадает в
 * статический HTML целиком.
 *
 * Разметка держится на классах из `@utmka/ui`: `glass`, `qhead`, `qtitle`,
 * `hint`, `result-url`. Своих цветов и шрифтов не заводим — только раскладка
 * в `landing.css`.
 */

import Link from 'next/link'

import { GeneratorScreen, PixelIcon } from '@utmka/ui'

import {
  landingAlsoPresets,
  landingPreset,
  LANDINGS,
  type Landing,
} from '@/lib/landings'

import { Faq, Sections } from './Sections'
import { LinkExample } from './LinkExample'

import './landing.css'

export function LandingPage({ landing }: { landing: Landing }) {
  const preset = landingPreset(landing)
  const also = landingAlsoPresets(landing)
  const others = LANDINGS.filter((item) => item.slug !== landing.slug)

  return (
    <div className="screen-scroll">
      <article className="lp">
        <header className="lp-head">
          <h1 className="lp-h1">{landing.h1}</h1>
          <p className="lp-lead">{landing.lead}</p>
        </header>

        {/* Генератор идёт первым: человек пришёл собрать ссылку, а не читать. */}
        <GeneratorScreen preset={preset} />

        {landing.example ? <LinkExample example={landing.example} /> : null}

        <Sections items={landing.sections} />

        {/* Подстановки и оговорка приходят из ядра: правило площадки одно на
            все оболочки, дублировать его текстом на странице нельзя. */}
        {preset?.placeholders?.length ? (
          <section className="glass lp-block">
            <div className="qhead">
              <span className="qchip qchip--magenta">
                <PixelIcon name="wand" />
              </span>
              <h2 className="qtitle qtitle--magenta">Что площадка подставит сама</h2>
            </div>
            <p className="hint lp-p">{preset.explain}</p>
            <dl className="lp-list">
              {preset.placeholders.map((placeholder) => (
                <div key={placeholder.token} className="lp-item">
                  <dt className="lp-term lp-token">{placeholder.token}</dt>
                  <dd className="lp-text">{placeholder.meaning}</dd>
                </div>
              ))}
            </dl>
            {preset.caveat ? <p className="lp-caveat">{preset.caveat}</p> : null}
          </section>
        ) : null}

        {also.length ? (
          <section className="glass lp-block">
            <div className="qhead">
              <span className="qchip qchip--teal">
                <PixelIcon name="link" />
              </span>
              <h2 className="qtitle qtitle--teal">Тот же источник, другой случай</h2>
            </div>
            <dl className="lp-list">
              {also.map((item) => (
                <div key={item.id} className="lp-item">
                  <dt className="lp-term">{item.title}</dt>
                  <dd className="lp-text">
                    {item.explain}
                    {item.caveat ? ` ${item.caveat}` : ''}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <Faq items={landing.faq} />

        <nav className="lp-next" aria-label="Другие площадки">
          <span className="hint">Другие площадки:</span>
          {others.map((item) => (
            <Link key={item.slug} className="chip" href={`/${item.slug}`}>
              {item.short}
            </Link>
          ))}
          <Link className="chip" href="/parse">
            Разбор чужой ссылки
          </Link>
        </nav>
      </article>
    </div>
  )
}
