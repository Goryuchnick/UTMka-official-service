'use client'

/**
 * Заведение и правка шаблона прямо в библиотеке.
 *
 * Раньше шаблон рождался только в генераторе: собрал ссылку → «Сохранить
 * шаблон». Но набор меток часто заводят заранее — под запуск, который ещё не
 * собирали, — и ради этого приходилось идти в генератор и придумывать адрес.
 *
 * На широком экране форма стоит боковой колонкой рядом со списком: видно, что
 * уже есть, и не нужно закрывать список, чтобы добавить ещё один.
 *
 * Правка — вторая роль той же формы (ARCHITECTURE §11, 2026-08-13: «чиним в
 * обеих оболочках»). В 2.2 шаблон редактировался, в 3.0 ручка `update` была
 * написана в обеих оболочках, но из интерфейса не звалась ни разу: поменять
 * одну метку означало удалить шаблон и завести заново, потеряв дату.
 */

import { useCallback, useEffect, useState } from 'react'
import { backendMessage, UTM_KEYS, type Template, type UtmKey } from '@utmka/core'

import { PixelIcon } from './PixelIcon'
import { TagHints } from './TagHints'
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
  /** Сообщить списку, что шаблон появился или изменился. */
  onSaved: (template: Template) => void
  /** Шаблон в правке. `null` — форма заводит новый. */
  edit?: Template | null
  /** Правку закрыли — хост обязан забыть, что редактировалось. */
  onCancelEdit?: () => void
}

export function TemplateForm({ onSaved, edit, onCancelEdit }: TemplateFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [params, setParams] = useState<Partial<Record<UtmKey, string>>>({})
  const [tag, setTag] = useState('')
  const [color, setColor] = useState<string>(TAG_COLORS[0] ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /* Форма подхватывает шаблон, который прислал хост, и разворачивается сама:
     человек нажал «Изменить» в карточке и ждёт заполненные поля, а не пустую
     кнопку «Новый шаблон» где-то сбоку. */
  useEffect(() => {
    if (!edit) return
    setName(edit.name)
    setBaseUrl(edit.baseUrl ?? '')
    setParams({ ...edit.params })
    setTag(edit.tagName ?? '')
    setColor(edit.tagColor || TAG_COLORS[0] || '')
    setError('')
    setOpen(true)
  }, [edit])

  const reset = useCallback(() => {
    setName('')
    setBaseUrl('')
    setParams({})
    setTag('')
    setError('')
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    reset()
    onCancelEdit?.()
  }, [reset, onCancelEdit])

  const submit = useCallback(async () => {
    if (!name.trim()) return
    setBusy(true)
    setError('')

    const fields = {
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      params,
      tagName: tag.trim() || undefined,
      tagColor: tag.trim() ? color : undefined,
    }

    try {
      /* Правка идёт через `update`, а не «удалить и создать заново»: у шаблона
         есть дата создания и он мог уже попасть в чужие выгрузки по имени. */
      const saved = edit
        ? await backend.templates.update(edit.id, fields)
        : await backend.templates.create(fields)
      onSaved(saved)
      sayAbout('saveTemplate')
      reset()
      setOpen(false)
      onCancelEdit?.()
    } catch (failure) {
      setError(backendMessage(failure))
    } finally {
      setBusy(false)
    }
  }, [name, baseUrl, params, tag, color, edit, onSaved, onCancelEdit, reset])

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
        <span className="qtitle qtitle--amber">{edit ? 'Правка шаблона' : 'Новый шаблон'}</span>
        <span className="spacer" />
        <button type="button" className="iconbtn" onClick={close} aria-label="Закрыть">
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
        <TagHints
          onPick={(picked, pickedColor) => {
            setTag(picked)
            if (pickedColor) setColor(pickedColor)
          }}
        />
      </div>

      {error ? <p className="hint hint--error">{error}</p> : null}

      <div className="result-row">
        <button type="button" className="btn btn--main" disabled={!name.trim() || busy} onClick={submit}>
          <PixelIcon name="save" />
          {busy ? 'Сохраняю…' : edit ? 'Сохранить правку' : 'Сохранить'}
        </button>
        <button type="button" className="btn btn--sm" onClick={close} disabled={busy}>
          Отмена
        </button>
      </div>
    </div>
  )
}
