'use client'

/**
 * Создание шаблона прямо в библиотеке.
 *
 * Раньше шаблон рождался только в генераторе: собрал ссылку → «Сохранить
 * шаблон». Но набор меток часто заводят заранее — под запуск, который ещё не
 * собирали, — и ради этого приходилось идти в генератор и придумывать адрес.
 *
 * На широком экране форма стоит боковой колонкой рядом со списком: видно, что
 * уже есть, и не нужно закрывать список, чтобы добавить ещё один.
 */

import { useCallback, useState } from 'react'
import { backendMessage, UTM_KEYS, type Template, type UtmKey } from '@utmka/core'

import { PixelIcon } from './PixelIcon'
import { TAG_COLORS } from './TemplatesScreen'
import { backend } from '../shell'
import { sayAbout } from '../lib/mascot-lines'

const FIELD_LABEL: Record<UtmKey, string> = {
  source: 'Источник',
  medium: 'Канал',
  campaign: 'Кампания',
  content: 'Содержание',
  term: 'Ключевое слово',
}

const FIELD_PLACEHOLDER: Record<UtmKey, string> = {
  source: 'yandex',
  medium: 'cpc',
  campaign: 'osenniy_nabor',
  content: 'banner_1',
  term: '{keyword}',
}

interface TemplateFormProps {
  /** Сообщить списку, что появился новый шаблон. */
  onCreated: (template: Template) => void
}

export function TemplateForm({ onCreated }: TemplateFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [params, setParams] = useState<Partial<Record<UtmKey, string>>>({})
  const [tag, setTag] = useState('')
  const [color, setColor] = useState<string>(TAG_COLORS[0] ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = useCallback(() => {
    setName('')
    setBaseUrl('')
    setParams({})
    setTag('')
    setError('')
  }, [])

  const submit = useCallback(async () => {
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      const created = await backend.templates.create({
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        params,
        tagName: tag.trim() || undefined,
        tagColor: tag.trim() ? color : undefined,
      })
      onCreated(created)
      sayAbout('saveTemplate')
      reset()
      setOpen(false)
    } catch (failure) {
      setError(backendMessage(failure))
    } finally {
      setBusy(false)
    }
  }, [name, baseUrl, params, tag, color, onCreated, reset])

  if (!open) {
    return (
      <button type="button" className="btn btn--main lib-add" onClick={() => setOpen(true)}>
        <PixelIcon name="star" />
        Новый шаблон
      </button>
    )
  }

  return (
    <div className="glass">
      <div className="qhead">
        <span className="qchip">
          <PixelIcon name="star" />
        </span>
        <span className="qtitle qtitle--amber">Новый шаблон</span>
        <span className="spacer" />
        <button type="button" className="iconbtn" onClick={() => setOpen(false)} aria-label="Закрыть">
          <PixelIcon name="close" />
        </button>
      </div>

      <div className="field">
        <span className="field-label">Название</span>
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
        <span className="field-label">Адрес страницы</span>
        <div className="input">
          <input
            type="text"
            className="ym-disable-keys ym-hide-content"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="test.ru/page"
            aria-label="Адрес страницы"
            autoComplete="off"
          />
        </div>
        {/* Адрес необязателен: шаблон хранит набор меток, а страница у одного
            и того же набора может меняться от запуска к запуску. */}
        <span className="hint">Можно оставить пустым — подставится тот, что в генераторе.</span>
      </div>

      {UTM_KEYS.map((key) => (
        <div className="field" key={key}>
          <span className="field-label">{FIELD_LABEL[key]}</span>
          <div className="input">
            <input
              type="text"
              className="ym-disable-keys ym-hide-content"
              value={params[key] ?? ''}
              onChange={(event) =>
                setParams((prev) => ({ ...prev, [key]: event.target.value }))
              }
              placeholder={FIELD_PLACEHOLDER[key]}
              aria-label={FIELD_LABEL[key]}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      ))}

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
        <button type="button" className="btn btn--main" disabled={!name.trim() || busy} onClick={submit}>
          <PixelIcon name="save" />
          {busy ? 'Сохраняю…' : 'Сохранить'}
        </button>
        <button type="button" className="btn btn--sm" onClick={() => setOpen(false)} disabled={busy}>
          Отмена
        </button>
      </div>
    </div>
  )
}
