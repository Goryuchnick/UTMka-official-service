'use client'

/**
 * ValueField — поле UTM-значения: пример в подсказке, выпадающий список типовых
 * значений и кнопка даты.
 *
 * Дата ведёт себя как date-picker в 2.2: выбранная дата **дописывается**
 * к значению через `_`, а не затирает его (`osenniy_nabor_2026-09-01`).
 */

import { useCallback, useRef } from 'react'
import { appendDate, placeholderFor, VALUE_HINTS, validateValue, type UtmKey } from '@utmka/core'

import { PixelIcon } from '@/components/PixelIcon'

const LABELS: Record<UtmKey, string> = {
  source: 'Источник — площадка',
  medium: 'Канал — тип трафика',
  campaign: 'Кампания',
  content: 'Содержание',
  term: 'Ключевое слово',
}

/** У каких полей есть кнопка даты — как в 2.2. */
const WITH_DATE: ReadonlySet<UtmKey> = new Set<UtmKey>(['campaign', 'content', 'term'])

interface ValueFieldProps {
  field: UtmKey
  value: string
  onChange: (value: string) => void
  /** Скрыть подпись — когда поле стоит внутри шага и заголовок уже есть. */
  bare?: boolean
}

export function ValueField({ field, value, onChange, bare }: ValueFieldProps) {
  const dateRef = useRef<HTMLInputElement>(null)
  const listId = `hints-${field}`

  const issues = validateValue(field, value)
  const state = issues.some((issue) => issue.level === 'error')
    ? 'input--err'
    : issues.length > 0
      ? 'input--warn'
      : ''

  const pickDate = useCallback(() => {
    const input = dateRef.current
    if (!input) return
    // showPicker есть не везде — тогда просто фокусируем нативное поле
    if (typeof input.showPicker === 'function') input.showPicker()
    else input.focus()
  }, [])

  return (
    <div className="field">
      {bare ? null : <span className="field-label">{LABELS[field]}</span>}

      <div className={`input ${state}`.trim()}>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholderFor(field)}
          aria-label={LABELS[field]}
          autoComplete="off"
          spellCheck={false}
          list={listId}
        />

        {WITH_DATE.has(field) ? (
          <>
            <button type="button" className="ibtn" onClick={pickDate} title="Добавить дату" aria-label="Добавить дату">
              <PixelIcon name="calendar" />
            </button>
            {/* нативный календарь: невидим, открывается кнопкой выше */}
            <input
              ref={dateRef}
              type="date"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => onChange(appendDate(value, event.target.value))}
            />
          </>
        ) : null}
      </div>

      <datalist id={listId}>
        {VALUE_HINTS[field].map((hint) => (
          <option key={hint.value} value={hint.value} label={hint.when} />
        ))}
      </datalist>

      {bare ? null : (
        <span className="hint hint--examples">
          {VALUE_HINTS[field]
            .slice(0, 3)
            .map((hint) => hint.value)
            .join(' · ')}
          {' — и другие в списке поля'}
        </span>
      )}
    </div>
  )
}
