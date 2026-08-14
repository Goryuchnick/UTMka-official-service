'use client'

/**
 * Подсказки тегов под полем — паритет с 2.2 (`renderTagSuggestions`).
 *
 * Две строки: чем помечено больше всего шаблонов и что ставили последним.
 * Нажатие подставляет и название, и цвет — без этого цвет каждый раз
 * выбирается заново, и один тег расползается по палитре.
 *
 * Данные компонент читает сам: он появляется в двух местах (форма библиотеки
 * и сохранение из генератора), и таскать через оба хоста список шаблонов с
 * историей означало бы дважды написать одно и то же чтение.
 */

import { useEffect, useState } from 'react'
import { popularTags, recentTags, type TagHint } from '@utmka/core'

import { backend } from '../shell'

interface TagHintsProps {
  /** Поставить тег: имя и цвет разом. Цвета может не быть — тогда он прежний. */
  onPick: (name: string, color?: string) => void
}

interface Hints {
  popular: TagHint[]
  recent: TagHint[]
}

const EMPTY: Hints = { popular: [], recent: [] }

async function fetchHints(): Promise<Hints> {
  try {
    const [templates, history] = await Promise.all([
      backend.templates.list(),
      backend.history.list(),
    ])
    const popular = popularTags(templates)
    return { popular, recent: recentTags(history, undefined, popular) }
  } catch {
    // Без фразы (в вебе) списки просто пусты — подсказок нет, и это не ошибка.
    return EMPTY
  }
}

export function TagHints({ onPick }: TagHintsProps) {
  const [hints, setHints] = useState<Hints>(EMPTY)

  useEffect(() => {
    let alive = true
    void fetchHints().then((found) => {
      if (alive) setHints(found)
    })
    return () => {
      alive = false
    }
  }, [])

  if (hints.popular.length === 0 && hints.recent.length === 0) return null

  return (
    <div className="taghints">
      <Row label="Частые" hints={hints.popular} onPick={onPick} />
      <Row label="Недавние" hints={hints.recent} onPick={onPick} />
    </div>
  )
}

interface RowProps extends TagHintsProps {
  label: string
  hints: TagHint[]
}

function Row({ label, hints, onPick }: RowProps) {
  if (hints.length === 0) return null

  return (
    <div className="taghints-row">
      <span className="taghints-label">{label}</span>
      {hints.map((hint) => (
        <button
          key={hint.name}
          type="button"
          className="chip chip--tag"
          onClick={() => onPick(hint.name, hint.color)}
        >
          {hint.color ? (
            <span className="tag-dot" style={{ background: hint.color }} aria-hidden="true" />
          ) : null}
          {hint.name}
        </button>
      ))}
    </div>
  )
}
