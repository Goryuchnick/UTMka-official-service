'use client'

/**
 * Быстрый старт — недавние шаблоны прямо на экране генератора (паритет с 2.2).
 *
 * Смысл в том, чтобы не ходить в библиотеку за тем, чем пользуешься каждый
 * день: три последних набора меток подставляются одним нажатием. Без входа
 * блок не показывается вовсе — шаблонов там просто нет.
 *
 * Остальные достаёт окно выбора (`TemplatePicker`), как «Открыть все» в 2.2.
 * ⚠️ Раньше на его месте стояла обычная `<a href="/templates">`: в вебе она
 * работала, а в окне десктопа роутер хеш-овый, и такая ссылка вела в никуда —
 * нажатие просто гасило приложение до пустого экрана.
 */

import { useCallback, useEffect, useState } from 'react'
import type { LinkDraft, Template } from '@utmka/core'

import { PixelIcon } from '../PixelIcon'
import { TemplatePicker } from './TemplatePicker'
import { useAccount } from '../../lib/account'
import { backend } from '../../shell'

const SHOWN = 3

async function fetchTemplates(): Promise<Template[]> {
  try {
    return await backend.templates.list()
  } catch {
    // Без фразы шаблонов просто нет — блок не показывается, и это не ошибка.
    return []
  }
}

/** Шаблон → черновик генератора. Пустой адрес не затирает набранный. */
function toDraft(template: Template): LinkDraft {
  return { baseUrl: template.baseUrl ?? '', params: template.params ?? {} }
}

interface QuickStartProps {
  onPick: (draft: LinkDraft) => void
}

export function QuickStart({ onPick }: QuickStartProps) {
  const { state } = useAccount()
  const [items, setItems] = useState<Template[]>([])
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (state !== 'member') return undefined

    let alive = true
    void fetchTemplates().then((rows) => {
      if (alive) setItems(rows)
    })
    return () => {
      alive = false
    }
  }, [state])

  const pick = useCallback(
    (template: Template) => {
      onPick(toDraft(template))
    },
    [onPick],
  )

  if (state !== 'member' || items.length === 0) return null

  return (
    <div className="quick">
      <span className="field-label">Недавние шаблоны</span>
      <div className="chips">
        {items.slice(0, SHOWN).map((template) => (
          <button
            key={template.id}
            type="button"
            className="chip"
            title={
              Object.entries(template.params ?? {})
                .map(([key, value]) => `${key}=${value}`)
                .join(' · ') || 'Без меток'
            }
            onClick={() => pick(template)}
          >
            {template.tagColor ? (
              <span className="tag-dot" style={{ background: template.tagColor }} aria-hidden="true" />
            ) : null}
            {template.name}
          </button>
        ))}
        {/* Кнопка показывается всегда: даже при двух шаблонах она объясняет,
            где лежит остальное, — а при двадцати без неё не обойтись. */}
        <button type="button" className="chip" onClick={() => setPicking(true)}>
          <PixelIcon name="star" size={12} />
          {items.length > SHOWN ? `Все — ${items.length}` : 'Все'}
        </button>
      </div>

      <TemplatePicker
        items={items}
        open={picking}
        onClose={() => setPicking(false)}
        onPick={pick}
      />
    </div>
  )
}
