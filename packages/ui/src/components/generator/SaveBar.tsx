'use client'

/**
 * Сохранение собранной ссылки: в историю и в шаблон.
 *
 * Без входа это приглашение, а не стена (ARCHITECTURE §5.3): человек уже
 * собрал ссылку, и терять её при закрытии вкладки обидно — здесь мы объясняем,
 * что фраза решает ровно эту проблему.
 */

import { useCallback, useState } from 'react'
import { backendMessage, type LinkDraft } from '@utmka/core'

import { PixelIcon } from '../PixelIcon'
import { TAG_COLORS } from '../TemplatesScreen'
import { useAccount } from '../../lib/account'
import { backend, NavLink } from '../../shell'

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
    try {
      await backend.history.add({ url, baseUrl: draft.baseUrl, params: draft.params, origin })
      setSaved('history')
    } catch (error) {
      setError(backendMessage(error))
    }
  }, [draft, url, origin])

  const saveTemplate = useCallback(async () => {
    setError('')
    try {
      await backend.templates.create({
        name: name.trim(),
        baseUrl: draft.baseUrl,
        params: draft.params,
        tagName: tag.trim() || undefined,
        tagColor: tag.trim() ? color : undefined,
      })
      setSaved('template')
      setNaming(false)
      setName('')
      setTag('')
    } catch (error) {
      setError(backendMessage(error))
    }
  }, [draft, name, tag, color])

  /* Гейт по входу — только там, где вход существует. В десктопе `caps.auth`
     равен false, и приглашение завести фразу не должно появляться вовсе. */
  if (backend.caps.auth && state !== 'member') {
    return (
      <div className="invite">
        <span>
          <b>Сохранить, чтобы не собирать заново?</b> Нужна кодовая фраза — одно поле, без почты
          и пароля. Сейчас ссылка живёт до закрытия вкладки.
        </span>
        <NavLink className="btn btn--sm" to="/login">
          <PixelIcon name="key" />
          Завести фразу
        </NavLink>
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
              className="ym-disable-keys ym-hide-content"
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
              className="ym-disable-keys ym-hide-content"
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
