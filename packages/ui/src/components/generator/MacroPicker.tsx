'use client'

/**
 * MacroPicker — системные подстановки площадок для одного поля.
 *
 * Подстановка (`{campaign_id}`, `{{ad_plan_id}}`) — то, что площадка сама
 * заменит на данные в момент клика. Набрать их по памяти нельзя: у каждой
 * площадки свой синтаксис, а ошибка не видна до отчёта — ссылка открывается,
 * просто вместо номера кампании приезжает текст скобок. Поэтому список, а не
 * подсказка в тексте.
 *
 * Поведение и оформление — как у соседей по полю (`ValueHints`, `DatePopover`):
 * своя панель вместо нативного списка, закрытие по клику мимо, Escape и
 * прокрутке. Отличие одно: групп несколько. Своя площадка (по `utm_source`)
 * раскрыта сразу, остальные — заголовками, чтобы список не разъезжался на
 * полсотни строк.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { MACRO_GROUPS, macrosForSource, type MacroGroup, type UtmKey } from '@utmka/core'

import { PixelIcon } from '../PixelIcon'
import { place } from '../../lib/popover'

/** Желаемые размеры панели — дублируют CSS, по ним считается место. */
const PANEL_HEIGHT = 300
const PANEL_WIDTH = 330

/** Зазор между кнопкой и панелью — дублирует `top`/`bottom` в CSS. */
const GAP = 8

/** Ниже этого панель показывать бессмысленно. */
const MIN_HEIGHT = 120

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
      staggerChildren: 0.015,
    },
  },
  gone: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.11 } },
}

const ROW: Variants = {
  hidden: { opacity: 0, x: -4 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.15 } },
  gone: { opacity: 0, transition: { duration: 0.07 } },
}

interface MacroPickerProps {
  /** Поле, в которое вставляем: по нему помечаем «обычно сюда». */
  field: UtmKey
  /** Площадка из `utm_source` — её группа раскрывается сразу. */
  source?: string
  onPick: (token: string) => void
}

export function MacroPicker({ field, source, onPick }: MacroPickerProps) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const [room, setRoom] = useState(PANEL_HEIGHT)
  const [shiftX, setShiftX] = useState(0)
  /** Какая группа раскрыта. Пусто — ни одной. */
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  const wrapRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const reduced = useReducedMotion()

  const own = useMemo(() => macrosForSource(source), [source])

  /* Своя площадка первой: человек уже нажал плитку, и её подстановки —
     единственные, которые у него сработают. Остальные ниже, но не спрятаны:
     разметку часто собирают заранее, до выбора кабинета. */
  const groups = useMemo<MacroGroup[]>(() => {
    if (!own) return [...MACRO_GROUPS]
    return [own, ...MACRO_GROUPS.filter((group) => group.id !== own.id)]
  }, [own])

  const toggle = useCallback(() => {
    setOpen((was) => {
      if (was) return false
      const anchor = buttonRef.current
      if (anchor) {
        const spot = place(anchor, PANEL_WIDTH, PANEL_HEIGHT, GAP)
        setUp(spot.up)
        setRoom(Math.max(MIN_HEIGHT, Math.min(PANEL_HEIGHT, spot.room)))
        setShiftX(spot.shiftX)
      }
      setOpenGroup(own?.id ?? MACRO_GROUPS[0]?.id ?? null)
      return true
    })
  }, [own])

  const pick = useCallback(
    (token: string) => {
      onPick(token)
      setOpen(false)
      buttonRef.current?.focus()
    },
    [onPick],
  )

  // Закрытие: клик мимо, Escape, прокрутка экрана и изменение размера окна.
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
    /* Своя прокрутка панель не закрывает — узнаём её по цели события, как в
       `ValueHints`: список длинный, и колесо над ним должно листать. */
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
    <span className="vhints macros" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="ibtn"
        onClick={toggle}
        title="Системные подстановки площадки"
        aria-label="Системные подстановки площадки"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? panelId : undefined}
      >
        <PixelIcon name="code" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            role="listbox"
            aria-label="Системные подстановки площадки"
            className={`vhints-panel macros-panel ${up ? 'vhints-panel--up' : ''}`.trim()}
            variants={PANEL}
            initial={reduced ? false : 'hidden'}
            animate="shown"
            exit={reduced ? undefined : 'gone'}
            /* ⚠️ Ни `top`, ни `bottom` отсюда не задавать — см. `ValueHints`:
               заданные оба края превращают высоту в полоску. */
            style={
              {
                transformOrigin: up ? 'bottom right' : 'top right',
                '--vhints-room': `${room}px`,
                '--vhints-shift': `${shiftX}px`,
              } as React.CSSProperties
            }
          >
            <p className="macros-lead">
              Площадка подставит значение сама. Скобки так и остаются в ссылке — кодировать их
              нельзя.
            </p>

            {groups.map((group) => {
              const expanded = openGroup === group.id
              return (
                <div key={group.id} className="macros-group">
                  <button
                    type="button"
                    className="macros-head"
                    aria-expanded={expanded}
                    onClick={() => setOpenGroup(expanded ? null : group.id)}
                  >
                    <b>{group.title}</b>
                    <i>{group.macros.length > 0 ? group.syntax : 'нет подстановок'}</i>
                    {own?.id === group.id ? <em>ваша площадка</em> : null}
                  </button>

                  {expanded ? (
                    <>
                      {group.caveat ? <p className="macros-caveat">{group.caveat}</p> : null}
                      {group.macros.map((macro) => {
                        const suits = macro.fields?.includes(field) ?? false
                        return (
                          <motion.button
                            key={macro.token}
                            type="button"
                            role="option"
                            aria-selected={false}
                            variants={reduced ? undefined : ROW}
                            className="vhints-row macros-row"
                            onClick={() => pick(macro.token)}
                          >
                            <b>
                              {macro.token}
                              {suits ? <em className="macros-fit">обычно сюда</em> : null}
                            </b>
                            <i>{macro.meaning}</i>
                          </motion.button>
                        )
                      })}
                    </>
                  ) : null}
                </div>
              )
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  )
}
