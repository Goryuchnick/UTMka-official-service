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

/** Высота панели с запасом — по ней решается, откидывать вверх или вниз. */
const PANEL_HEIGHT = 260

const GAP = 8

/** Ближайший предок, который прокручивается: экран инструмента, а не окно. */
function scrollBox(from: HTMLElement | null): HTMLElement | null {
  for (let node = from?.parentElement ?? null; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return node
  }
  return null
}

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
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) {
        const edge = scrollBox(buttonRef.current)?.getBoundingClientRect()
        const below = (edge ? edge.bottom : window.innerHeight) - rect.bottom
        const above = rect.top - (edge ? edge.top : 0)
        setUp(below < PANEL_HEIGHT && above > below)
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
       перехвата, потому что скроллится внутренний контейнер, а не окно. */
    const onScroll = () => setOpen(false)

    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
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
            style={{ transformOrigin: up ? 'bottom right' : 'top right', top: `${GAP}px` }}
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
