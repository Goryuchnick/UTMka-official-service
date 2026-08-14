'use client'

/**
 * Список типовых значений поля — своя панель вместо нативного `<datalist>`.
 *
 * Нативный список отдаёт браузер, и он живёт по своим правилам: не
 * оформляется под «ПРОНИН-ОС», не показывает пояснение «когда это брать»
 * (атрибут `label` вебвью игнорирует) и, главное, **не закрывается при
 * прокрутке** — панель оставалась висеть над уехавшим полем.
 *
 * Приёмы те же, что у календаря (`DatePopover`): пружина Motion с разворотом
 * из поля, каскад строк, закрытие по клику мимо и Escape. Плюс закрытие при
 * прокрутке — то, чего нативному списку и не хватало.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { VALUE_HINTS, type UtmKey } from '@utmka/core'

import { PixelIcon } from '../PixelIcon'
import { place } from '../../lib/popover'

/** Желаемые размеры панели — дублируют CSS, по ним считается место. */
const PANEL_HEIGHT = 260
const PANEL_WIDTH = 288

/** Зазор между кнопкой и панелью — дублирует `top`/`bottom` в `.vhints-panel`. */
const GAP = 8

/** Ниже этого панель показывать бессмысленно — две строки списка. */
const MIN_HEIGHT = 104

const PANEL: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  shown: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      visualDuration: 0.22,
      bounce: 0.28,
      delayChildren: 0.03,
      staggerChildren: 0.02,
    },
  },
  gone: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.11 } },
}

const ROW: Variants = {
  hidden: { opacity: 0, x: -4 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.15 } },
  gone: { opacity: 0, transition: { duration: 0.07 } },
}

interface ValueHintsProps {
  field: UtmKey
  /** Что уже набрано — по этому фильтруем список. */
  value: string
  onPick: (value: string) => void
}

export function ValueHints({ field, value, onPick }: ValueHintsProps) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  /** Раскладка на момент открытия: сколько места по высоте и сдвиг от кромки. */
  const [room, setRoom] = useState(PANEL_HEIGHT)
  const [shiftX, setShiftX] = useState(0)

  const wrapRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const reduced = useReducedMotion()

  /* Фильтр по набранному: у источника два десятка вариантов, и листать их
     глазами дольше, чем дописать три буквы. */
  const shown = useMemo(() => {
    const needle = value.trim().toLowerCase()
    const all = VALUE_HINTS[field]
    if (!needle) return all
    const found = all.filter(
      (hint) =>
        hint.value.toLowerCase().includes(needle) || hint.when.toLowerCase().includes(needle),
    )
    return found.length > 0 ? found : all
  }, [field, value])

  const toggle = useCallback(() => {
    setOpen((was) => {
      if (was) return false
      const anchor = buttonRef.current
      if (anchor) {
        const spot = place(anchor, PANEL_WIDTH, PANEL_HEIGHT, GAP)
        setUp(spot.up)
        /* Панель не выталкивает себя за кромку экрана, а укорачивается: список
           и так прокручивается внутри, поэтому потерять пару строк дешевле,
           чем обрезать их краем без всякого признака, что там что-то есть. */
        setRoom(Math.max(MIN_HEIGHT, Math.min(PANEL_HEIGHT, spot.room)))
        setShiftX(spot.shiftX)
      }
      return true
    })
  }, [])

  const pick = useCallback(
    (next: string) => {
      onPick(next)
      setOpen(false)
      buttonRef.current?.focus()
    },
    [onPick],
  )

  // Закрытие: клик мимо, Escape и — в отличие от нативного списка — прокрутка.
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
    /* Панель привязана к полю: уехало поле — панель обязана исчезнуть, иначе
       она висит посреди экрана над чужим содержимым. Слушаем на фазе
       перехвата, потому что скроллится внутренний контейнер, а не окно.

       ⚠️ Но список сам прокручивается (в нём до двух десятков значений), и на
       фазе перехвата сюда прилетала и его собственная прокрутка: колесо над
       панелью закрывало её вместо того, чтобы листать. Своё событие узнаём по
       цели — она лежит внутри обёртки поля. */
    const onScroll = (event: Event) => {
      const target = event.target as Node | null
      if (target && target.nodeType === Node.ELEMENT_NODE && wrapRef.current?.contains(target)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)

    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <span className="vhints" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="ibtn"
        onClick={toggle}
        title="Типовые значения"
        aria-label="Типовые значения"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? panelId : undefined}
      >
        <PixelIcon name="grid" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            role="listbox"
            aria-label="Типовые значения"
            className={`vhints-panel ${up ? 'vhints-panel--up' : ''}`.trim()}
            variants={PANEL}
            initial={reduced ? false : 'hidden'}
            animate="shown"
            exit={reduced ? undefined : 'gone'}
            /* ⚠️ Ни `top`, ни `bottom` отсюда не задавать. Отступ от кнопки
               описан в CSS двумя взаимоисключающими правилами (`top` у обычной
               панели, `bottom` у откинутой вверх), и инлайновый `top` перебивал
               `top: auto` у `--up`: заданными оказывались ОБА края, и высота
               считалась как расстояние между ними — минус шестнадцать пикселей,
               то есть полоска в один padding. Видно это было только там, где
               панель откидывается вверх: в невысоком окне и на нижних полях. */
            style={
              {
                transformOrigin: up ? 'bottom right' : 'top right',
                '--vhints-room': `${room}px`,
                '--vhints-shift': `${shiftX}px`,
              } as React.CSSProperties
            }
          >
            {shown.map((hint) => (
              <motion.button
                key={hint.value}
                type="button"
                role="option"
                aria-selected={hint.value === value}
                variants={reduced ? undefined : ROW}
                className="vhints-row"
                onClick={() => pick(hint.value)}
              >
                <b>{hint.value}</b>
                <i>{hint.when}</i>
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  )
}
