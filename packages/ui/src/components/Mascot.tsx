'use client'

/**
 * MascotBar — планка помощника, прибитая к нижней кромке шапки устройства.
 *
 * Маскот тот же, что на сайте: пиксельный Александр спрайт-лентами. Он не
 * декорация — он проговаривает реплику: на новой фразе включается `talk`, на
 * «готово» кивает, на поломанном удивляется, пока модель считает — думает.
 * В покое изредка моргает, чтобы планка не выглядела картинкой.
 *
 * Высота фиксированная и от длины реплики не зависит: планка — часть шапки,
 * а не блок контента. Длинный текст обрезается многоточием, полный остаётся
 * в `title` и доступен скринридеру.
 */

import { useEffect, useState } from 'react'

import { MascotSprite } from './MascotSprite'
import { animDurationMs, type MascotState } from '../lib/mascot-anim'
import { useMascotSay, type MascotTone } from '../lib/mascot'

/** Настроение экрана → состояние спрайта. */
const BY_TONE: Record<MascotTone, MascotState> = {
  neutral: 'talk',
  done: 'nod',
  alert: 'surprised',
  think: 'think',
}

/** Сколько «говорить» на реплику: примерно скорость чтения, но в рамках. */
function talkMs(line: string): number {
  return Math.min(6000, Math.max(1600, line.length * 55))
}

export function MascotBar() {
  const { line, tone } = useMascotSay()

  return (
    <div className="mascotbar">
      {/* key пересоздаёт лицо на каждой новой реплике: так начальное состояние
          задаётся в useState, а не переставляется эффектом (иначе — каскад
          рендеров, о котором предупреждает react-hooks). */}
      <MascotFace key={`${tone}:${line}`} line={line} tone={tone} />
      <p className="bubble" title={line} aria-live="polite">
        {line}
      </p>
    </div>
  )
}

function MascotFace({ line, tone }: { line: string; tone: MascotTone }) {
  const [state, setState] = useState<MascotState>(() => BY_TONE[tone])

  /* Зацикленные состояния (`talk`) сами не кончаются — снимаем по таймеру.
     У one-shot ждём собственную длительность, чтобы не обрывать на середине. */
  useEffect(() => {
    const hold = state === 'talk' ? talkMs(line) : animDurationMs(state)
    const id = window.setTimeout(() => setState('idle'), hold)
    return () => window.clearTimeout(id)
    // Реагируем только на монтирование: дальше состояние ведут таймеры.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Моргание в покое — с разбросом, иначе слышно метроном. */
  useEffect(() => {
    if (state !== 'idle') return undefined
    const id = window.setTimeout(() => setState('blink'), 4000 + Math.random() * 5000)
    return () => window.clearTimeout(id)
  }, [state])

  return (
    <MascotSprite
      className="mascot"
      state={state}
      onEnd={(finished) => {
        // one-shot отыграл — возвращаемся в покой, откуда снова возможно моргание
        if (finished !== 'idle' && finished !== 'talk') setState('idle')
      }}
    />
  )
}
