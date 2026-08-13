'use client'

/**
 * Заголовок колонки, по которому сортируют.
 *
 * Паритет с 2.2: там таблицу упорядочивали кликом по шапке — по дате,
 * источнику, каналу, кампании, тегу. На пятистах строках без этого остаётся
 * только поиск, а «покажи все ссылки одной кампании подряд» не сделать.
 *
 * Третье нажатие снимает сортировку и возвращает порядок хранилища — иначе
 * из режима «по алфавиту» нельзя вернуться к «сначала свежие».
 */

import type { SortState } from '../lib/sorting'

interface SortHeadProps {
  column: string
  label: string
  state: SortState
  onToggle: (column: string) => void
}

export function SortHead({ column, label, state, onToggle }: SortHeadProps) {
  const active = state.column === column
  const direction = active ? state.direction : undefined

  return (
    <button
      type="button"
      className={`sorthead${active ? ' sorthead--on' : ''}`}
      onClick={() => onToggle(column)}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      title={
        active
          ? direction === 'asc'
            ? 'По возрастанию — нажмите, чтобы перевернуть'
            : 'По убыванию — нажмите, чтобы снять сортировку'
          : `Упорядочить по «${label}»`
      }
    >
      {label}
      <span className="sorthead__mark" aria-hidden="true">
        {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  )
}
