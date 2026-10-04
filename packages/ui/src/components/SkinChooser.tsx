'use client'

/**
 * Выбор оформления при первом визите: «Простой» («Точки») или «Гиковый»
 * («ПРОНИН-ОС»).
 *
 * Инструмент в обоих один и тот же, разное только оформление, поэтому окно
 * спрашивает один раз и уходит. Ответ — ключ `utmka.skin` в хранилище (тот же,
 * что ставит кнопка вида в шапке), так что вернувшийся человек окна больше не
 * видит, а передумавший переключает вид кнопкой.
 *
 * Превью нарисованы стилями, а не снимками: окно открывается до того, как
 * выбрано оформление, и должно одинаково показывать оба.
 */

import { useEffect, useRef } from 'react'

import { applySkin, useSkinChosen } from '../lib/theme'

export function SkinChooser() {
  const chosen = useSkinChosen()
  const first = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!chosen) first.current?.focus()
  }, [chosen])

  if (chosen) return null

  return (
    <div className="skinpick-back">
      <div className="skinpick" role="dialog" aria-modal="true" aria-labelledby="skinpick-title">
        <h2 id="skinpick-title" className="skinpick__title">
          Какой вид вам ближе?
        </h2>
        <p className="skinpick__lead">
          Инструмент один и тот же — меняется только оформление. Передумаете — переключите
          кнопкой в шапке.
        </p>

        <div className="skinpick__opts">
          <button
            ref={first}
            type="button"
            className="skinpick__opt skinpick__opt--dots"
            onClick={() => applySkin('dots')}
          >
            <span className="skinpick__preview" aria-hidden="true">
              <i className="pv-line pv-line--title" />
              <i className="pv-line" />
              <i className="pv-dots" />
              <i className="pv-btn" />
            </span>
            <b className="skinpick__name">Простой</b>
            <span className="skinpick__what">Светлый, как сайт: по одному вопросу на экране, ничего лишнего.</span>
          </button>

          <button
            type="button"
            className="skinpick__opt skinpick__opt--os"
            onClick={() => applySkin('os')}
          >
            <span className="skinpick__preview" aria-hidden="true">
              <i className="pv-bar" />
              <i className="pv-line pv-line--title" />
              <i className="pv-line" />
              <i className="pv-box" />
              <i className="pv-btn" />
            </span>
            <b className="skinpick__name">Гиковый</b>
            <span className="skinpick__what">Ретро-терминал «ПРОНИН-ОС»: тёмный, все инструменты на виду.</span>
          </button>
        </div>
      </div>
    </div>
  )
}
