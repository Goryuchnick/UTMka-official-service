'use client'

/**
 * ResultCard — готовая ссылка и главное действие экрана.
 *
 * Копирование — самое крупное действие: в 2.2 это была рядовая кнопка,
 * и по ней чаще всего промахивались (DESIGN-BRIEF §3.2).
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
}

export function ResultCard({ url, tools = true }: ResultCardProps) {
  const [copied, setCopied] = useState(false)

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

  return (
    <div className="result">
      <UrlPreview url={url} />
      <div className="result-row">
        <button type="button" className="btn btn--main" onClick={copy}>
          <PixelIcon name={copied ? 'check' : 'copy'} />
          {copied ? 'Скопировано' : 'Скопировать ссылку'}
        </button>
        <span className="result-len">{url.length} символов</span>
      </div>
      {tools ? <LinkTools url={url} /> : null}
    </div>
  )
}
