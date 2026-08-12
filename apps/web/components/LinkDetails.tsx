'use client'

/**
 * Модалка деталей ссылки — паритет с 2.2 (`urlDetailModal`).
 *
 * Одно окно вместо трёх кнопок в строке: разбор по параметрам, замечания,
 * QR, сокращение и «применить в генератор». Открывается из истории по клику
 * на запись — там строка узкая, и всё это в неё не помещалось.
 *
 * Значения показываются через ядро: `parseUrl` разбирает готовую ссылку,
 * `validateDraft` объясняет, что в ней сломается. Своей логики здесь нет.
 */

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { parseUrl, UTM_KEYS, UTM_PARAM_NAMES, validateDraft, type HistoryItem } from '@utmka/core'

import { PixelIcon } from '@/components/PixelIcon'
import { IssueList } from '@/components/generator/IssueList'
import { LinkTools } from '@/components/generator/LinkTools'

const PANEL: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', visualDuration: 0.28, bounce: 0.18 } },
  gone: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.13 } },
}

interface LinkDetailsProps {
  item: HistoryItem | null
  onClose: () => void
  onDelete?: (id: string) => void
}

export function LinkDetails({ item, onClose, onDelete }: LinkDetailsProps) {
  const router = useRouter()
  const reduced = useReducedMotion()

  const parsed = useMemo(() => (item ? parseUrl(item.url) : null), [item])
  const issues = useMemo(
    () => (parsed ? validateDraft({ baseUrl: parsed.baseUrl, params: parsed.params }) : []),
    [parsed],
  )

  if (!item) return null

  const apply = () => {
    const params = new URLSearchParams({ url: item.baseUrl || item.url })
    for (const [key, value] of Object.entries(item.params ?? {})) {
      if (value) params.set(key, value)
    }
    onClose()
    router.push(`/?${params.toString()}`)
  }

  return (
    <AnimatePresence>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Детали ссылки">
        <div className="modal-back" onClick={onClose} />

        <motion.div
          className="modal-card"
          variants={PANEL}
          initial={reduced ? false : 'hidden'}
          animate="shown"
          exit={reduced ? undefined : 'gone'}
        >
          <div className="qhead">
            <span className="qchip">
              <PixelIcon name="link" />
            </span>
            <span className="qtitle qtitle--amber">
              {item.params?.campaign || item.params?.source || 'Ссылка'}
            </span>
            <span className="spacer" />
            <button type="button" className="iconbtn" onClick={onClose} aria-label="Закрыть">
              <PixelIcon name="close" />
            </button>
          </div>

          <div className="params">
            <div className="param">
              <span className="param-name">адрес</span>
              <span className="param-value">{item.baseUrl || '—'}</span>
            </div>
            {UTM_KEYS.map((key) => {
              const value = item.params?.[key]
              return (
                <div className="param" key={key}>
                  <span className="param-name">
                    <code className="param-code">{UTM_PARAM_NAMES[key]}</code>
                  </span>
                  <span className={`param-value${value ? '' : ' param-value--empty'}`}>
                    {value || 'не заполнено'}
                  </span>
                </div>
              )
            })}
          </div>

          {issues.length > 0 ? (
            <IssueList issues={issues} />
          ) : (
            <p className="hint">Замечаний нет: регистр, разделители и тип трафика на месте.</p>
          )}

          {/* QR и сокращение — те же инструменты, что под готовой ссылкой. */}
          <LinkTools url={item.shortUrl ?? item.url} />

          <div className="result-row">
            <button type="button" className="btn btn--main" onClick={apply}>
              <PixelIcon name="wand" />
              Применить в генератор
            </button>
            {onDelete ? (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  onDelete(item.id)
                  onClose()
                }}
              >
                <PixelIcon name="trash" />
                Удалить
              </button>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
