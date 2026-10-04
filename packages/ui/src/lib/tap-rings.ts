'use client'

import { useEffect } from 'react'

/**
 * Круги от нажатия — приём из роликов: в месте касания расходится кольцо цвета
 * раздела. Только в «Простом» виде и только на тех нажатиях, что двигают дело:
 * главная кнопка, плитка площадки, возврат к пройденному шагу.
 *
 * Кольцо живёт в `<body>`, а не внутри `.dev`: там `dots.css` гасит любую
 * анимацию, и это правило нужно сохранить для остального экрана. Цвет кольцо
 * берёт у кнопки — переменная `--accent` задаётся разделом на `.dev`.
 */

const TARGETS = '.btn--main, .tile, .step-done'

export function useTapRings(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest(TARGETS) : null
      if (!target || target.matches(':disabled')) return
      const ring = document.createElement('span')
      ring.className = 'tap-ring'
      ring.style.left = `${event.clientX}px`
      ring.style.top = `${event.clientY}px`
      ring.style.borderColor = getComputedStyle(target).getPropertyValue('--accent') || ''
      ring.addEventListener('animationend', () => ring.remove())
      document.body.appendChild(ring)
    }

    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [enabled])
}
