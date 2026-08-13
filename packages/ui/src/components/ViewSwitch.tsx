'use client'

/** Переключатель вида списка — список / плитки / таблица, как в 2.2. */

import { PixelIcon } from './PixelIcon'
import type { ViewMode } from '../lib/view'

const MODES: readonly { id: ViewMode; label: string }[] = [
  { id: 'list', label: 'Список' },
  { id: 'grid', label: 'Плитки' },
  { id: 'table', label: 'Таблица' },
]

interface ViewSwitchProps {
  view: ViewMode
  onChange: (next: ViewMode) => void
}

export function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  return (
    <div className="chips" role="group" aria-label="Вид списка">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className="chip"
          aria-pressed={view === mode.id}
          onClick={() => onChange(mode.id)}
          style={view === mode.id ? { color: 'var(--hv2-fg)', borderColor: 'var(--hv2-primary)' } : undefined}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}

/** Иконка пустого состояния — общая для истории и шаблонов. */
export function EmptyNote({ text }: { text: string }) {
  return (
    <p className="empty">
      <PixelIcon name="search" />
      {text}
    </p>
  )
}
