'use client'

/**
 * Приглашение пройти обучение — и сам тур по нажатию.
 *
 * ⚠️ Раньше тур открывался сам при первом визите и закрывал собой весь экран.
 * Так первое, что видел человек, — не инструмент, а пять экранов текста поверх
 * него: пришёл собрать ссылку, а его учат. Теперь в углу висит тихая плашка
 * («Первый раз здесь?»), тур запускается только по нажатию, а крестик убирает
 * предложение навсегда — отметка та же, что ставит пройденный тур.
 *
 * Решение «предлагать или нет» читается из localStorage при монтировании через
 * `useSyncExternalStore`: на сервере его нет, а установка стейта в эффекте дала
 * бы лишний каскад рендеров.
 */

import { useCallback, useState, useSyncExternalStore } from 'react'

import { PixelIcon } from './PixelIcon'
import { Onboarding, markOnboardingSeen, shouldShowOnboarding } from './Onboarding'

const NO_CHANGES = () => () => {}
const NOT_ON_SERVER = () => false

export function OnboardingGate() {
  const firstVisit = useSyncExternalStore(NO_CHANGES, shouldShowOnboarding, NOT_ON_SERVER)
  /** Плашку убрали в этом сеансе: отметка уже поставлена, но стор её не отдаёт. */
  const [hidden, setHidden] = useState(false)
  const [tour, setTour] = useState(false)

  const dismiss = useCallback(() => {
    markOnboardingSeen()
    setHidden(true)
  }, [])

  const start = useCallback(() => setTour(true), [])

  /* Тур закрылся — он уже пометил себя пройденным, плашке возвращаться незачем. */
  const close = useCallback(() => {
    setTour(false)
    setHidden(true)
  }, [])

  return (
    <>
      <Onboarding open={tour} onClose={close} />

      {firstVisit && !hidden && !tour ? (
        <div className="onb-invite" role="note">
          <span className="onb-invite__mark" aria-hidden="true">
            <PixelIcon name="wand" />
          </span>
          <span className="onb-invite__text">
            <b>Первый раз здесь?</b>
            {/* Пять экранов — обещание объёма: человек решает, есть ли у него
                на это минута, до того как нажмёт. */}
            <i>Пять коротких экранов — что умеет инструмент</i>
          </span>
          <button type="button" className="btn btn--sm" onClick={start}>
            Показать
          </button>
          <button
            type="button"
            className="iconbtn onb-invite__close"
            onClick={dismiss}
            title="Больше не предлагать"
            aria-label="Больше не предлагать"
          >
            <PixelIcon name="close" />
          </button>
        </div>
      ) : null}
    </>
  )
}
