'use client'

/**
 * ValueField — поле UTM-значения: пример в подсказке, выпадающий список типовых
 * значений и кнопка даты.
 *
 * Дата ведёт себя как date-picker в 2.2: выбранная дата **дописывается**
 * к значению через `_`, а не затирает его (`osenniy_nabor_2026-09-01`).
 */

import { useCallback } from 'react'
import { appendDate, placeholderFor, VALUE_HINTS, validateValue, type UtmKey } from '@utmka/core'

import { DatePopover } from './DatePopover'
import { ValueHints } from './ValueHints'

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
  const issues = validateValue(field, value)
  const state = issues.some((issue) => issue.level === 'error')
    ? 'input--err'
    : issues.length > 0
      ? 'input--warn'
      : ''

  const pickDate = useCallback(
    (iso: string) => {
      onChange(appendDate(value, iso))
    },
    [onChange, value],
  )

  return (
    <div className="field">
      {bare ? null : <span className="field-label">{LABELS[field]}</span>}

      <div className={`input ${state}`.trim()}>
        <input
          type="text"
          className="ym-disable-keys ym-hide-content"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholderFor(field)}
          aria-label={LABELS[field]}
          autoComplete="off"
          spellCheck={false}
        />

        <ValueHints field={field} value={value} onPick={onChange} />
        {WITH_DATE.has(field) ? <DatePopover onPick={pickDate} /> : null}
      </div>

      {bare ? null : (
        <span className="hint hint--examples" title="Полный список — в выпадающем списке поля">
          {VALUE_HINTS[field]
            .slice(0, 3)
            .map((hint) => hint.value)
            .join(' · ')}
        </span>
      )}
    </div>
  )
}
