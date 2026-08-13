'use client'

import { useCallback, useMemo, useState } from 'react'

/**
 * Сортировка списков — паритет с 2.2.
 *
 * Там сортировали и историю, и шаблоны: по дате, источнику, каналу, кампании,
 * тегу и названию, в обе стороны. В 3.0 это потерялось, и в таблице на пятьсот
 * строк остался только поиск.
 *
 * Сортируем **данные**, а не разметку таблицы: тогда порядок один и тот же в
 * списке, плитках и таблице — переключение вида не перетасовывает записи.
 */

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  /** Поле, по которому сортируем. `null` — порядок хранилища (свежие сверху). */
  column: string | null
  direction: SortDirection
}

/** Что сравниваем для конкретной колонки. */
export type SortValue<T> = (item: T) => string | number | undefined

export interface SortColumn<T> {
  key: string
  label: string
  value: SortValue<T>
  /** Даты сравниваем числом, а не строкой. */
  numeric?: boolean
}

/**
 * Сравнение с понятными правилами:
 * — пустые значения всегда внизу, независимо от направления. Иначе половина
 *   экрана при сортировке по тегу — это записи без тега;
 * — строки сравниваются по-русски (`localeCompare`), иначе «Я» окажется
 *   раньше «а», а цифры внутри имён — не по порядку.
 */
function compare(
  left: string | number | undefined,
  right: string | number | undefined,
  direction: SortDirection,
  numeric: boolean,
): number {
  const emptyLeft = left === undefined || left === ''
  const emptyRight = right === undefined || right === ''
  if (emptyLeft && emptyRight) return 0
  if (emptyLeft) return 1
  if (emptyRight) return -1

  const sign = direction === 'asc' ? 1 : -1

  if (numeric) {
    const a = typeof left === 'number' ? left : Date.parse(String(left))
    const b = typeof right === 'number' ? right : Date.parse(String(right))
    if (Number.isNaN(a) || Number.isNaN(b)) return 0
    return (a - b) * sign
  }

  return String(left).localeCompare(String(right), 'ru', { numeric: true }) * sign
}

export interface UseSortResult<T> {
  state: SortState
  /** Нажатие по колонке: та же колонка переворачивает порядок, другая — берёт своё направление. */
  toggle: (column: string) => void
  /** Сбросить к порядку хранилища. */
  reset: () => void
  sort: (items: readonly T[]) => T[]
}

export function useSort<T>(columns: readonly SortColumn<T>[], initial?: SortState): UseSortResult<T> {
  const [state, setState] = useState<SortState>(initial ?? { column: null, direction: 'desc' })

  const toggle = useCallback((column: string) => {
    setState((prev) => {
      if (prev.column !== column) {
        /* Первое нажатие: даты — от свежих, текст — от «А». Так ожидаемее:
           «по дате» почти всегда значит «сначала новое», а «по источнику» —
           «по алфавиту». */
        const meta = columns.find((item) => item.key === column)
        return { column, direction: meta?.numeric ? 'desc' : 'asc' }
      }
      // Второе нажатие переворачивает, третье — снимает сортировку.
      if (prev.direction === 'asc') return { column, direction: 'desc' }
      return { column: null, direction: 'desc' }
    })
  }, [columns])

  const reset = useCallback(() => setState({ column: null, direction: 'desc' }), [])

  const sort = useCallback(
    (items: readonly T[]): T[] => {
      const meta = columns.find((item) => item.key === state.column)
      if (!meta) return [...items]

      // `map/sort/map` — чтобы сортировка была устойчивой: при равных значениях
      // порядок остаётся тем, что пришёл из хранилища.
      return items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const result = compare(
            meta.value(a.item),
            meta.value(b.item),
            state.direction,
            meta.numeric ?? false,
          )
          return result !== 0 ? result : a.index - b.index
        })
        .map((row) => row.item)
    },
    [columns, state],
  )

  return useMemo(() => ({ state, toggle, reset, sort }), [state, toggle, reset, sort])
}
