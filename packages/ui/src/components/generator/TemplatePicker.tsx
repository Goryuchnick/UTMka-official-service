'use client'

/**
 * Выбор шаблона из всех сохранённых — паритет с 2.2 (`allTemplatesModal`).
 *
 * В быстром старте помещаются три последних набора меток, а их бывает
 * несколько десятков. В 2.2 кнопка «Открыть все» открывала окно со списком и
 * поиском — и это не то же самое, что уйти в раздел «Шаблоны»: человек стоит
 * посреди сборки ссылки, у него заполнены поля, и уход со страницы означает
 * бросить начатое.
 *
 * Поиск идёт по названию, тегу и самим меткам: набор чаще помнят не по имени,
 * а по тому, что внутри («тот, где medium=cpc и осенняя кампания»).
 */

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { UTM_KEYS, type Template } from '@utmka/core'

import { PixelIcon } from '../PixelIcon'
import { NavLink } from '../../shell'

interface TemplatePickerProps {
  /** Все шаблоны, какие есть. Читает их хост — он же показывает три первых. */
  items: Template[]
  open: boolean
  onClose: () => void
  onPick: (template: Template) => void
}

export function TemplatePicker({ items, open, onClose, onPick }: TemplatePickerProps) {
  const [query, setQuery] = useState('')
  const reduced = useReducedMotion()

  // Окно открывают заново — значит ищут другое. Прошлый запрос только мешает.
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((template) =>
      [template.name, template.tagName ?? '', ...Object.values(template.params ?? {})]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [items, query])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Все шаблоны"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
        >
          <div className="modal-back" onClick={onClose} />
          <motion.div
            className="modal-card glass"
            initial={reduced ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 10, scale: 0.99 }}
            transition={{ type: 'spring', visualDuration: 0.26, bounce: 0.2 }}
          >
            <div className="qhead">
              <span className="qchip">
                <PixelIcon name="star" />
              </span>
              <span className="qtitle qtitle--amber">Все шаблоны</span>
              <span className="spacer" />
              <button type="button" className="iconbtn" onClick={onClose} aria-label="Закрыть">
                <PixelIcon name="close" />
              </button>
            </div>

            <div className="field">
              <div className="input">
                <PixelIcon name="search" />
                <input
                  type="text"
                  className="ym-disable-keys ym-hide-content"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск по названию, тегу и меткам"
                  aria-label="Поиск по шаблонам"
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>

            {shown.length === 0 ? (
              <p className="empty">
                {items.length === 0
                  ? 'Шаблонов пока нет. Соберите ссылку и сохраните набор меток.'
                  : 'По этому запросу ничего нет.'}
              </p>
            ) : (
              <div className="picker">
                {shown.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="picker-row"
                    onClick={() => {
                      onPick(template)
                      onClose()
                    }}
                  >
                    <span className="hist-name">
                      {template.tagColor ? (
                        <span
                          className="tag-dot"
                          style={{ background: template.tagColor }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {template.name}
                      {template.tagName ? <span className="hist-tag">{template.tagName}</span> : null}
                    </span>
                    <span className="hist-url">
                      {UTM_KEYS.filter((key) => template.params?.[key])
                        .map((key) => `${key}=${template.params?.[key]}`)
                        .join(' · ') || 'Без меток'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="result-row">
              <span className="result-len">
                {shown.length === items.length
                  ? `${items.length} шт.`
                  : `${shown.length} из ${items.length}`}
              </span>
              <span className="spacer" />
              {/* Правка, удаление и выгрузка живут в разделе — сюда они не
                  едут: это окно про «взять и продолжить сборку». */}
              <NavLink to="/templates" className="btn btn--sm" onClick={onClose}>
                <PixelIcon name="star" />
                Открыть библиотеку
              </NavLink>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
