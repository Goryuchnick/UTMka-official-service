'use client'

/**
 * Быстрый старт — недавние шаблоны прямо на экране генератора (паритет с 2.2).
 *
 * Смысл в том, чтобы не ходить в библиотеку за тем, чем пользуешься каждый
 * день: три последних набора меток подставляются одним нажатием. Без входа
 * блок не показывается вовсе — шаблонов там просто нет.
 */

import { useEffect, useState } from 'react'
import type { LinkDraft, Template } from '@utmka/core'

import { PixelIcon } from '../PixelIcon'
import { useAccount } from '../../lib/account'
import { backend } from '../../shell'

const SHOWN = 3

async function fetchRecent(): Promise<Template[]> {
  try {
    return (await backend.templates.list()).slice(0, SHOWN)
  } catch {
    // Без фразы шаблонов просто нет — блок не показывается, и это не ошибка.
    return []
  }
}

interface QuickStartProps {
  onPick: (draft: LinkDraft) => void
}

export function QuickStart({ onPick }: QuickStartProps) {
  const { state } = useAccount()
  const [items, setItems] = useState<Template[]>([])

  useEffect(() => {
    if (state !== 'member') return undefined

    let alive = true
    void fetchRecent().then((rows) => {
      if (alive) setItems(rows)
    })
    return () => {
      alive = false
    }
  }, [state])

  if (state !== 'member' || items.length === 0) return null

  return (
    <div className="quick">
      <span className="field-label">Недавние шаблоны</span>
      <div className="chips">
        {items.map((template) => (
          <button
            key={template.id}
            type="button"
            className="chip"
            title={
              Object.entries(template.params ?? {})
                .map(([key, value]) => `${key}=${value}`)
                .join(' · ') || 'Без меток'
            }
            onClick={() => onPick({ baseUrl: template.baseUrl ?? '', params: template.params ?? {} })}
          >
            {template.tagColor ? (
              <span className="tag-dot" style={{ background: template.tagColor }} aria-hidden="true" />
            ) : null}
            {template.name}
          </button>
        ))}
        <a className="chip" href="/templates">
          <PixelIcon name="star" size={12} />
          Все
        </a>
      </div>
    </div>
  )
}
