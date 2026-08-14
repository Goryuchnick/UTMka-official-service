import type { Metadata } from 'next'
import Link from 'next/link'

import { GeneratorScreen, PixelIcon } from '@utmka/ui'

import { Faq, faqJsonLd, Sections } from '@/components/landing/Sections'
import { HOME, LANDINGS } from '@/lib/landings'

import '@/components/landing/landing.css'

/**
 * Главная — генератор и текст под ним.
 *
 * Раньше страница отдавала поисковику 291 символ: генератор стоял за границей
 * Suspense из-за `useSearchParams`, и в статический HTML попадала заглушка
 * «Загружаю генератор…». Экран больше строку запроса хуком не читает
 * (см. `GeneratorScreen`), поэтому форма пререндерится вместе со страницей,
 * а объяснения ниже дают ей тему, по которой её вообще можно найти.
 */

export const metadata: Metadata = {
  title: { absolute: 'Конструктор UTM-меток онлайн — UTMka' },
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(HOME.faq)) }}
      />

      <div className="screen-scroll">
        <article className="lp">
          <header className="lp-head">
            <h1 className="lp-h1">{HOME.h1}</h1>
            <p className="lp-lead">{HOME.lead}</p>
          </header>

          <GeneratorScreen />

          <Sections items={HOME.sections} />

          <section className="glass lp-block">
            <div className="qhead">
              <span className="qchip qchip--teal">
                <PixelIcon name="link" />
              </span>
              <h2 className="qtitle qtitle--teal">Метки под конкретную площадку</h2>
            </div>
            <p className="hint lp-p">
              У каждой площадки свои значения и свои подстановки. Откройте нужную —
              генератор там уже настроен, а рядом разобрано, что площадка подставляет
              сама и где метки чаще всего теряются.
            </p>
            <nav className="lp-next" aria-label="Площадки">
              {LANDINGS.map((landing) => (
                <Link key={landing.slug} className="chip" href={`/${landing.slug}`}>
                  {landing.short}
                </Link>
              ))}
            </nav>
          </section>

          <Faq items={HOME.faq} />
        </article>
      </div>
    </>
  )
}
