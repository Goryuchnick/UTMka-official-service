'use client'

/**
 * MascotSprite — покадровый проигрыватель спрайт-ленты через Web Animations API.
 * Порт 1:1 с сайта (`components/mascot/MascotSprite.tsx`).
 *
 * Окно (overflow: hidden, квадрат) показывает один кадр; внутри `<img>` со всей
 * лентой, которая едет translateX 0 → −100% с easing `steps(frames)` — отсюда
 * ровный покадровый прокрут без единого таймера в React.
 *
 * ⚠️ Грабля с one-shot состояниями: у WAAPI по умолчанию `fill: 'none'`, и по
 * завершении эффект снимается — transform откатывается к translateX(0%), то есть
 * на кадр 0, а не на последний. Между концом анимации и переключением в idle
 * виден горизонтальный дёрг. Лечится ручной фиксацией последнего кадра в
 * `onfinish`; CSS `fill: forwards` не годится — там −100% соответствует кадру
 * `frames`, которого не существует.
 */

import { useCallback, useEffect, useRef, type CSSProperties } from 'react'

import { MASCOT_ANIM, type MascotState } from '@/lib/mascot-anim'

interface MascotSpriteProps {
  state: MascotState
  /** Вызывается по завершении one-shot анимации. */
  onEnd?: (state: MascotState) => void
  className?: string
  style?: CSSProperties
}

export function MascotSprite({ state, onEnd, className, style }: MascotSpriteProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const animRef = useRef<Animation | null>(null)
  const onEndRef = useRef(onEnd)

  useEffect(() => {
    onEndRef.current = onEnd
  })

  const def = MASCOT_ANIM[state]

  const start = useCallback(() => {
    const img = imgRef.current
    if (!img) return

    const current = MASCOT_ANIM[state]
    animRef.current?.cancel()
    img.style.transform = ''

    // Просили не двигать — не двигаем: остаётся первый кадр ленты.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onEndRef.current?.(state)
      return
    }

    const animation = img.animate(
      [{ transform: 'translateX(0%)' }, { transform: 'translateX(-100%)' }],
      {
        duration: (current.frames / current.fps) * 1000,
        iterations: current.loop ? Infinity : 1,
        easing: `steps(${current.frames})`,
      },
    )
    animRef.current = animation

    if (!current.loop) {
      animation.onfinish = () => {
        if (imgRef.current) {
          imgRef.current.style.transform = `translateX(${(-(current.frames - 1) / current.frames) * 100}%)`
        }
        onEndRef.current?.(state)
      }
    }
  }, [state])

  useEffect(() => {
    start()
    return () => animRef.current?.cancel()
  }, [start])

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'hidden', aspectRatio: '1 / 1', ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- лента едет transform'ом, next/image здесь только мешает */}
      <img
        ref={imgRef}
        src={def.file}
        alt=""
        draggable={false}
        onLoad={start}
        style={{
          height: '100%',
          width: 'auto',
          maxWidth: 'none',
          display: 'block',
          imageRendering: 'pixelated',
          willChange: 'transform',
        }}
      />
    </span>
  )
}
