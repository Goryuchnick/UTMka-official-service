'use client'

/**
 * More — второстепенные действия под одной тихой кнопкой «Ещё».
 *
 * Нужен оформлению «Точки»: там на экране одно главное действие, а выгрузки,
 * образцы файлов и правка ссылки уходят в меню. В «ПРОНИН-ОС» компонент
 * прозрачен — дети встают в ряд как раньше, раскладка той системы не меняется.
 *
 * Меню закрывается нажатием на пункт, кликом мимо и Escape.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useSkin } from '../lib/theme'

interface MoreProps {
  children: ReactNode
  label?: string
}

export function More({ children, label = 'Ещё' }: MoreProps) {
  const { skin } = useSkin()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (skin !== 'dots') return <>{children}</>

  return (
    <span className="more" ref={ref}>
      <button
        type="button"
        className="btn more__btn"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        {label}
      </button>
      {open ? (
        // Клик по пункту сначала отрабатывает сам пункт, потом всплывает сюда.
        <span className="more__menu" role="group" aria-label={label} onClick={() => setOpen(false)}>
          {children}
        </span>
      ) : null}
    </span>
  )
}
