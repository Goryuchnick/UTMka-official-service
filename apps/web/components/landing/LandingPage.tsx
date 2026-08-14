/**
 * Шаблон посадочной страницы площадки.
 *
 * Серверный компонент, и это главное в нём: заголовок, объяснения и вопросы
 * уходят в HTML сразу. Генератор — клиентский остров под Suspense; он и должен
 * дорисовываться позже, а вот текст, ради которого страница попадает в выдачу,
 * ждать гидрации не может.
 *
 * Разметка держится на классах из `@utmka/ui`: `glass`, `qhead`, `qtitle`,
 * `hint`, `result-url`. Своих цветов и шрифтов не заводим — только раскладка
 * в `landing.css`.
 */

import { Suspense } from 'react'
import Link from 'next/link'

import { GeneratorScreen, PixelIcon } from '@utmka/ui'

import { landingPreset, LANDINGS, type Landing } from '@/lib/landings'

import './landing.css'

export function LandingPage({ landing }: { landing: Landing }) {
  const preset = landingPreset(landing)
  const others = LANDINGS.filter((item) => item.slug !== landing.slug)

  return (
    <div className="screen-scroll">
      <article className="lp">
        <header className="lp-head">
          <h1 className="lp-h1">{landing.h1}</h1>
          <p className="lp-lead">{landing.lead}</p>
        </header>

        {/* Генератор идёт первым: человек пришёл собрать ссылку, а не читать. */}
        <Suspense fallback={<p className="empty">Загружаю генератор…</p>}>
          <GeneratorScreen preset={preset} />
        </Suspense>

        {landing.example ? (
          <section className="glass lp-block">
            <div className="qhead">
              <span className="qchip">
                <PixelIcon name="link" />
              </span>
              <h2 className="qtitle qtitle--amber">Как выглядит готовая ссылка</h2>
            </div>
            <div className="result-url">
              <span>{landing.example.base}</span>
              {landing.example.params.map(([key, value], index) => (
                <span key={key}>
                  <span className="k">{`${index === 0 ? '?' : '&'}${key}=`}</span>
                  <span className="v">{value}</span>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {landing.sections.map((section) => (
          <section key={section.title} className="glass lp-block">
            <div className="qhead">
              <span className="qchip qchip--teal">
                <PixelIcon name="check" />
              </span>
              <h2 className="qtitle qtitle--teal">{section.title}</h2>
            </div>

            {section.paragraphs?.map((text) => (
              <p key={text.slice(0, 40)} className="hint lp-p">
                {text}
              </p>
            ))}

            {section.bullets ? (
              <dl className="lp-list">
                {section.bullets.map((bullet) => (
                  <div key={bullet.term} className="lp-item">
                    <dt className="lp-term">{bullet.term}</dt>
                    <dd className="lp-text">{bullet.text}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        ))}

        {/* Подстановки и оговорка приходят из ядра: правило площадки одно на
            все оболочки, дублировать его текстом на странице нельзя. */}
        {preset?.placeholders?.length ? (
          <section className="glass lp-block">
            <div className="qhead">
              <span className="qchip qchip--magenta">
                <PixelIcon name="wand" />
              </span>
              <h2 className="qtitle qtitle--magenta">
                Что площадка подставит сама
              </h2>
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

        <section className="glass lp-block">
          <div className="qhead">
            <span className="qchip">
              <PixelIcon name="help" />
            </span>
            <h2 className="qtitle qtitle--amber">Частые вопросы</h2>
          </div>
          <div className="lp-faq">
            {landing.faq.map((item) => (
              <details key={item.q} className="lp-q">
                <summary>{item.q}</summary>
                <p className="lp-text">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <nav className="lp-next" aria-label="Другие площадки">
          <span className="hint">Другие площадки:</span>
          {others.map((item) => (
            <Link key={item.slug} className="chip" href={`/${item.slug}`}>
              {item.h1.replace(/^UTM-метки (для )?/, '')}
            </Link>
          ))}
          <Link className="chip" href="/">
            Универсальный генератор
          </Link>
          <Link className="chip" href="/parse">
            Разбор чужой ссылки
          </Link>
        </nav>
      </article>
    </div>
  )
}
