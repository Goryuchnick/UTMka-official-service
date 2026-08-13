'use client'

/**
 * PresetTiles — плитки площадок простого режима. Каждая плитка — пресет ядра:
 * нажатие заполняет источник, канал и подстановки разом.
 *
 * Знак площадки — цветной пиксельный медальон (палитра пака сайта), подсветка
 * за курсором — приём двери курса на главной (.h2-wash / .h2-glow).
 */

import type { PointerEvent as ReactPointerEvent } from 'react'
import { PRESETS, type Preset } from '@utmka/core'

import { PresetMark } from './PresetMark'

interface PresetTilesProps {
  activeId?: string
  onPick: (preset: Preset) => void
}

export function PresetTiles({ activeId, onPick }: PresetTilesProps) {
  const handleMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--mx', `${event.clientX - box.left}px`)
    event.currentTarget.style.setProperty('--my', `${event.clientY - box.top}px`)
  }

  return (
    <div className="tiles">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="tile"
          aria-pressed={activeId === preset.id}
          onPointerMove={handleMove}
          onClick={() => onPick(preset)}
        >
          <span className="tile-ico">
            <PresetMark id={preset.id} />
          </span>
          <span className="tile-name">{preset.title}</span>
          <span className="tile-hint">{preset.hint}</span>
        </button>
      ))}
    </div>
  )
}
