'use client'

/**
 * Сохранение собранной ссылки: в историю и в шаблон.
 *
 * Без входа это приглашение, а не стена (ARCHITECTURE §5.3): человек уже
 * собрал ссылку, и терять её при закрытии вкладки обидно — здесь мы объясняем,
 * что фраза решает ровно эту проблему.
 */

import { useCallback, useState } from 'react'
import Link from 'next/link'
import type { LinkDraft } from '@utmka/core'

import { PixelIcon } from '@/components/PixelIcon'
import { TAG_COLORS } from '@/components/TemplatesScreen'
import { useAccount } from '@/lib/account'

type Saved = 'no' | 'history' | 'template'

interface SaveBarProps {
  draft: LinkDraft
  url: string
  origin?: 'single' | 'batch' | 'brief' | 'parse'
}

export function SaveBar({ draft, url, origin = 'single' }: SaveBarProps) {
  const { state } = useAccount()

  const [saved, setSaved] = useState<Saved>('no')
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(TAG_COLORS[0])
  const [tag, setTag] = useState('')
  const [error, setError] = useState('')

  const keep = useCallback(async () => {
    setError('')
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, baseUrl: draft.baseUrl, params: draft.params, origin }),
    })
    if (response.ok) setSaved('history')
    else setError('Не удалось сохранить')
  }, [draft, url, origin])

  const saveTemplate = useCallback(async () => {
    setError('')
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        baseUrl: draft.baseUrl,
        params: draft.params,
        tagName: tag.trim() || undefined,
        tagColor: tag.trim() ? color : undefined,
      }),
    })
    const data = (await response.json()) as { error?: string }
    if (response.ok) {
      setSaved('template')
      setNaming(false)
      setName('')
      setTag('')
    } else {
      setError(data.error ?? 'Не удалось сохранить шаблон')
    }
  }, [draft, name, tag, color])

  if (state !== 'member') {
    return (
      <div className="invite">
        <span>
          <b>Сохранить, чтобы не собирать заново?</b> Нужна кодовая фраза — одно поле, без почты
          и пароля. Сейчас ссылка живёт до закрытия вкладки.
        </span>
        <Link className="btn btn--sm" href="/login">
          <PixelIcon name="key" />
          Завести фразу
        </Link>
      </div>
    )
  }

  if (naming) {
    return (
      <div className="glass">
        <div className="field">
          <span className="field-label">Название шаблона</span>
          <div className="input">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Осенний набор — Директ"
              aria-label="Название шаблона"
              autoFocus
            />
          </div>
        </div>

        <div className="field">
          <span className="field-label">Тег</span>
          <div className="input">
            <input
              type="text"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="Необязательно: клиент, сезон, проект"
              aria-label="Тег шаблона"
            />
          </div>
          <div className="palette" role="group" aria-label="Цвет тега">
            {TAG_COLORS.map((value) => (
              <button
                key={value}
                type="button"
                className="swatch"
                aria-pressed={color === value}
                aria-label={`Цвет ${value}`}
                style={{ background: value }}
                onClick={() => setColor(value)}
              />
            ))}
          </div>
        </div>

        {error ? <p className="hint hint--error">{error}</p> : null}

        <div className="result-row">
          <button type="button" className="btn btn--main" disabled={!name.trim()} onClick={saveTemplate}>
            Сохранить
          </button>
          <button type="button" className="btn btn--sm" onClick={() => setNaming(false)}>
            Отмена
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="result-row">
      <button type="button" className="btn btn--sm" onClick={keep} disabled={saved === 'history'}>
        <PixelIcon name={saved === 'history' ? 'check' : 'clock'} />
        {saved === 'history' ? 'В истории' : 'В историю'}
      </button>
      <button type="button" className="btn btn--sm" onClick={() => setNaming(true)}>
        <PixelIcon name={saved === 'template' ? 'check' : 'star'} />
        {saved === 'template' ? 'Шаблон сохранён' : 'Сохранить шаблон'}
      </button>
      {error ? <span className="hint hint--error">{error}</span> : null}
    </div>
  )
}
