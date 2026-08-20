'use client'

/**
 * ResultCard — готовая ссылка и главное действие экрана.
 *
 * Копирование — самое крупное действие: в 2.2 это была рядовая кнопка,
 * и по ней чаще всего промахивались (DESIGN-BRIEF §3.2).
 *
 * Рядом — правка собранной ссылки. Она нужна ровно там, где формы не хватает:
 * в простом режиме полей всего четыре, а дописать хвост чужой системы,
 * поправить опечатку в пути или подставить готовую ссылку из письма человек
 * хочет прямо здесь, не возвращаясь к вопросам. Правка не заводит второй
 * черновик: текст разбирается обратно в поля формы (`draftFromUrl` в ядре),
 * поэтому QR, сокращатель, история и шаблон получают то же самое, что видно
 * на экране. Цена — ссылка пересобирается по правилам: метки встают в
 * канонический порядок, а чужие параметры остаются на своих местах.
 */

import { useCallback, useEffect, useState } from 'react'

import { PixelIcon } from '../PixelIcon'
import { LinkTools } from './LinkTools'
import { UrlPreview } from './UrlPreview'
import { sayAbout } from '../../lib/mascot-lines'

interface ResultCardProps {
  url: string
  /** QR и короткая ссылка. Скрываются там, где ссылка показана справочно. */
  tools?: boolean
  /**
   * Принять правку ссылки. Без обработчика кнопки правки нет — так экран
   * разбора показывает исправленную ссылку, не предлагая править её ещё раз.
   */
  onApply?: (url: string) => void
}

export function ResultCard({ url, tools = true, onApply }: ResultCardProps) {
  const [copied, setCopied] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      sayAbout('copy')
      setCopied(true)
    } catch {
      // буфер недоступен (нет разрешения или http) — ссылку можно выделить руками
      setCopied(false)
    }
  }, [url])

  const apply = useCallback(() => {
    const next = (draft ?? '').trim()
    setDraft(null)
    if (!next || !onApply) return
    onApply(next)
    sayAbout('edited')
  }, [draft, onApply])

  if (draft !== null) {
    return (
      <div className="result">
        <textarea
          className="result-edit ym-disable-keys ym-hide-content"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            /* Enter применяет, перевод строки в ссылке не нужен; Escape
               возвращает как было. */
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              apply()
            }
            if (event.key === 'Escape') setDraft(null)
          }}
          aria-label="Ссылка целиком"
          spellCheck={false}
          rows={3}
          autoFocus
        />
        <p className="hint">
          Правьте что угодно — адрес, метки, чужие параметры. Разложу обратно по полям и пересоберу:
          порядок меток станет каноническим, остальное останется как есть.
        </p>
        <div className="result-row">
          <button type="button" className="btn btn--main" onClick={apply}>
            <PixelIcon name="check" />
            Применить
          </button>
          <button type="button" className="btn btn--sm" onClick={() => setDraft(null)}>
            Отмена
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="result">
      <UrlPreview url={url} />
      <div className="result-row">
        <button type="button" className="btn btn--main" onClick={copy}>
          <PixelIcon name={copied ? 'check' : 'copy'} />
          {copied ? 'Скопировано' : 'Скопировать ссылку'}
        </button>
        {onApply ? (
          <button type="button" className="btn btn--sm" onClick={() => setDraft(url)}>
            <PixelIcon name="edit" />
            Править ссылку
          </button>
        ) : null}
        <span className="result-len">{url.length} символов</span>
      </div>
      {tools ? <LinkTools url={url} /> : null}
    </div>
  )
}
