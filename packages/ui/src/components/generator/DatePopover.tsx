'use client'

/**
 * DatePopover — календарь, привязанный к кнопке поля.
 *
 * Раньше здесь стоял нативный `<input type="date">` с `showPicker()`: браузер
 * якорил окно к самому инпуту, а инпут лежал в `.sr-only` за пределами экрана —
 * поэтому календарь выпадал в произвольном месте. Своя панель решает и это,
 * и вид: нативный календарь не поддаётся оформлению под «ПРОНИН-ОС».
 *
 * Анимация — Motion (motion.dev): пружина с малым отскоком, `transform-origin`
 * в углу кнопки, поэтому панель разворачивается именно из неё, а не всплывает
 * ниоткуда. Дни выезжают лёгким каскадом через `stagger` по вариантам.
 * Раскладка Motion (`initial/animate/exit` + `AnimatePresence`) — типовой
 * шаблон из документации, см. mcp motion-dev → animations/AnimatePresence.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'

import { PixelIcon } from '../PixelIcon'

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const

const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
] as const

/** ISO-дата в местном часовом поясе: `toISOString()` увёл бы день назад. */
function toIso(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Понедельник первой недели сетки — 42 клетки, шесть строк без прыжков высоты. */
function gridStart(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const shift = (first.getDay() + 6) % 7
  return new Date(first.getFullYear(), first.getMonth(), 1 - shift)
}

/** Высота панели с запасом — по ней решается, откидывать её вверх или вниз. */
const PANEL_HEIGHT = 366

/** Зазор между кнопкой и панелью — дублирует `top/bottom` в `.cal`. */
const GAP = 10

/** Ближайший предок, который прокручивается: экран инструмента, а не окно. */
function scrollBox(from: HTMLElement | null): HTMLElement | null {
  for (let node = from?.parentElement ?? null; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return node
  }
  return null
}

const PANEL: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: -8 },
  shown: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', visualDuration: 0.24, bounce: 0.3, delayChildren: 0.04, staggerChildren: 0.004 },
  },
  gone: { opacity: 0, scale: 0.96, y: -6, transition: { duration: 0.12 } },
}

const CELL: Variants = {
  hidden: { opacity: 0, y: -4 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.16 } },
  gone: { opacity: 0, transition: { duration: 0.08 } },
}

interface DatePopoverProps {
  /** Что подставить в значение поля — уже готовая ISO-дата. */
  onPick: (iso: string) => void
  /** Подпись кнопки и панели: у разных полей дата значит разное. */
  label?: string
}

export function DatePopover({ onPick, label = 'Добавить дату' }: DatePopoverProps) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  /** Панель откидывается вверх, если снизу не помещается. */
  const [up, setUp] = useState(false)
  /** Доводка по вертикали, когда не помещается ни вниз, ни вверх. */
  const [shift, setShift] = useState(0)

  const wrapRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const reduced = useReducedMotion()

  const today = useMemo(() => toIso(new Date()), [])

  const days = useMemo(() => {
    const start = gridStart(month)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
      return { iso: toIso(date), day: date.getDate(), outside: date.getMonth() !== month.getMonth() }
    })
  }, [month])

  const toggle = useCallback(() => {
    setOpen((was) => {
      if (was) return false
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) {
        // Считаем место не до края окна, а до края прокручиваемой области:
        // экран инструмента скроллится внутри рамки устройства, и панель,
        // «поместившаяся» по окну, всё равно уезжала бы за нижнюю кромку.
        const edge = scrollBox(buttonRef.current)?.getBoundingClientRect()
        const below = (edge ? edge.bottom : window.innerHeight) - rect.bottom
        const above = rect.top - (edge ? edge.top : 0)
        // Не помещается ни вниз, ни вверх — идём туда, где места больше,
        // остаток добирает доводка в эффекте ниже.
        setUp(below < PANEL_HEIGHT && above > below)
        setShift(0)
      }
      return true
    })
  }, [])

  const pick = useCallback(
    (iso: string) => {
      onPick(iso)
      setOpen(false)
      buttonRef.current?.focus()
    },
    [onPick],
  )

  /* Доводка по факту: если панель вылезла за кромку прокручиваемой области,
     подтягиваем её обратно. Панель остаётся у кнопки — просто перекрывает
     поле, а не обрезается краем экрана.

     Меряем по `offsetHeight` и прямоугольнику кнопки, а не по rect панели:
     в этот момент по ней ещё идёт пружина, и getBoundingClientRect вернул бы
     размеры промежуточного кадра (scale 0.9). */
  useEffect(() => {
    if (!open) return undefined
    const panel = panelRef.current
    const anchor = buttonRef.current
    if (!panel || !anchor) return undefined

    const edge = scrollBox(panel)?.getBoundingClientRect()
    const limitTop = (edge ? edge.top : 0) + 8
    const limitBottom = (edge ? edge.bottom : window.innerHeight) - 8

    const height = panel.offsetHeight
    const rect = anchor.getBoundingClientRect()
    const top = up ? rect.top - GAP - height : rect.bottom + GAP

    const over = top + height - limitBottom
    const under = limitTop - top

    if (over > 0) setShift(-over)
    else if (under > 0) setShift(under)

    return undefined
  }, [open, up])

  // Закрытие: клик мимо и Escape. Слушатели вешаются только пока панель открыта.
  useEffect(() => {
    if (!open) return undefined

    const onDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }

    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const shiftMonth = (delta: number) => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  return (
    <span className="datepick" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="ibtn"
        onClick={toggle}
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
      >
        <PixelIcon name="calendar" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={label}
            className={`cal ${up ? 'cal--up' : ''}`.trim()}
            variants={PANEL}
            initial={reduced ? false : 'hidden'}
            animate="shown"
            exit={reduced ? undefined : 'gone'}
            style={
              {
                transformOrigin: up ? 'bottom right' : 'top right',
                '--cal-shift': `${shift}px`,
              } as React.CSSProperties
            }
          >
            <div className="cal-head">
              <button type="button" className="cal-nav" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
                ‹
              </button>
              <span className="cal-month">
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </span>
              <button type="button" className="cal-nav" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
                ›
              </button>
            </div>

            <div className="cal-week">
              {WEEKDAYS.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>

            <div className="cal-grid">
              {days.map((cell) => (
                <motion.button
                  key={cell.iso}
                  type="button"
                  variants={reduced ? undefined : CELL}
                  className="cal-day"
                  data-outside={cell.outside ? '' : undefined}
                  data-today={cell.iso === today ? '' : undefined}
                  onClick={() => pick(cell.iso)}
                >
                  {cell.day}
                </motion.button>
              ))}
            </div>

            <div className="cal-foot">
              <button type="button" className="cal-today" onClick={() => pick(today)}>
                Сегодня
              </button>
              <span className="cal-note">Допишется через «_»</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  )
}
