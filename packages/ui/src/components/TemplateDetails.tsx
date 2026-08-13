'use client'

/**
 * Карточка шаблона: из чего он состоит.
 *
 * Паритет с 2.2 — там плитку открывали и смотрели набор меток целиком. В
 * списке метки слиты в одну строку через точку и обрезаны многоточием, так что
 * «а что там в content» иначе не узнать.
 */

import { useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { buildUrl, UTM_KEYS, validateDraft, type Template, type UtmKey } from '@utmka/core'

import { PixelIcon } from './PixelIcon'
import { IssueList } from './generator/IssueList'
import { sayAbout } from '../lib/mascot-lines'

const FIELD_LABEL: Record<UtmKey, string> = {
  source: 'Источник',
  medium: 'Канал',
  campaign: 'Кампания',
  content: 'Содержание',
  term: 'Ключевое слово',
}

interface TemplateDetailsProps {
  template: Template | null
  onClose: () => void
  onApply: (template: Template) => void
  onDelete: (id: string) => void
}

export function TemplateDetails({ template, onClose, onApply, onDelete }: TemplateDetailsProps) {
  const reduced = useReducedMotion()

  /* Ссылка-пример: показываем, что получится, если взять шаблон как есть.
     Адреса у шаблона может не быть — тогда это просто хвост с метками. */
  const preview = useMemo(
    () =>
      template
        ? buildUrl({ baseUrl: template.baseUrl ?? '', params: template.params ?? {} })
        : '',
    [template],
  )

  const issues = useMemo(
    () =>
      template
        ? validateDraft({ baseUrl: template.baseUrl ?? '', params: template.params ?? {} }).filter(
            (issue) => issue.level !== 'info',
          )
        : [],
    [template],
  )

  return (
    <AnimatePresence>
      {template ? (
        <motion.div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Шаблон «${template.name}»`}
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
              <span className="qtitle qtitle--amber">{template.name}</span>
              <span className="spacer" />
              <button type="button" className="iconbtn" onClick={onClose} aria-label="Закрыть">
                <PixelIcon name="close" />
              </button>
            </div>

            {template.tagName ? (
              <div className="result-row">
                <span className="hist-tag">
                  {template.tagColor ? (
                    <span
                      className="tag-dot"
                      style={{ background: template.tagColor }}
                      aria-hidden="true"
                    />
                  ) : null}
                  {template.tagName}
                </span>
              </div>
            ) : null}

            <div className="htable" role="table">
              <div className="htable-row htable-row--pair" role="row">
                <span role="cell">Адрес</span>
                <span role="cell" className="htable-url">
                  {template.baseUrl?.trim() || '— возьмётся из генератора'}
                </span>
              </div>
              {UTM_KEYS.map((key) => (
                <div className="htable-row htable-row--pair" role="row" key={key}>
                  <span role="cell">{FIELD_LABEL[key]}</span>
                  <span role="cell" className="htable-url">
                    {template.params?.[key] || '—'}
                  </span>
                </div>
              ))}
            </div>

            {preview ? (
              <div className="field">
                <span className="field-label">Что получится</span>
                <div className="urlbox">{preview}</div>
              </div>
            ) : null}

            {issues.length > 0 ? <IssueList issues={issues} /> : null}

            <div className="result-row">
              <button
                type="button"
                className="btn btn--main"
                onClick={() => {
                  onApply(template)
                  onClose()
                }}
              >
                <PixelIcon name="use" />
                Подставить в генератор
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(preview).catch(() => undefined)
                  sayAbout('copy')
                }}
                disabled={!preview}
              >
                <PixelIcon name="copy" />
                Скопировать пример
              </button>
              <span className="spacer" />
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  onDelete(template.id)
                  onClose()
                }}
              >
                <PixelIcon name="trash" />
                Удалить
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
