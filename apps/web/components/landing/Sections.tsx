/**
 * Текстовые блоки страниц: объяснения и вопросы.
 *
 * Общие для главной и посадочных — чтобы разметка заголовков и разбивка
 * «термин — последствие» не разъезжались между страницами, а `FAQPage` в
 * структурированных данных описывал ровно те вопросы, что видит человек.
 *
 * Серверные компоненты: ничего интерактивного здесь нет, раскрытие вопросов
 * делает сам `<details>`.
 */

import { PixelIcon, type IconName } from '@utmka/ui'

import type { LandingSection } from '@/lib/landings'

const TONES = ['amber', 'teal', 'magenta'] as const

export function Sections({
  items,
  icon = 'check',
}: {
  items: readonly LandingSection[]
  icon?: IconName
}) {
  return (
    <>
      {items.map((section, index) => {
        const tone = TONES[index % TONES.length]

        return (
          <section key={section.title} className="glass lp-block">
            <div className="qhead">
              <span className={tone === 'amber' ? 'qchip' : `qchip qchip--${tone}`}>
                <PixelIcon name={icon} />
              </span>
              <h2 className={`qtitle qtitle--${tone}`}>{section.title}</h2>
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
        )
      })}
    </>
  )
}

export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <section className="glass lp-block">
      <div className="qhead">
        <span className="qchip">
          <PixelIcon name="help" />
        </span>
        <h2 className="qtitle qtitle--amber">Частые вопросы</h2>
      </div>
      <div className="lp-faq">
        {items.map((item) => (
          <details key={item.q} className="lp-q">
            <summary>{item.q}</summary>
            <p className="lp-text">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

/** Разметка вопросов для поисковика — та же, что показана человеку. */
export function faqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
}
