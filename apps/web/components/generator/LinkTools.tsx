'use client'

/**
 * LinkTools — QR-код и короткая ссылка для готовой ссылки.
 *
 * Обе функции были в 2.2 и обязаны доехать (ARCHITECTURE §4.1): QR с выгрузкой
 * в PNG и SVG, сокращение через clck.ru. Живут прямо под результатом —
 * там, где ссылка уже собрана.
 */

import { useCallback, useRef, useState } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'

import { PixelIcon } from '@/components/PixelIcon'

interface LinkToolsProps {
  url: string
}

export function LinkTools({ url }: LinkToolsProps) {
  const [qrOpen, setQrOpen] = useState(false)
  const [short, setShort] = useState<string | null>(null)
  const [shortError, setShortError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const shorten = useCallback(async () => {
    setLoading(true)
    setShortError(null)
    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data: unknown = await response.json()
      const value =
        typeof data === 'object' && data !== null && 'short' in data ? String(data.short) : ''
      const error =
        typeof data === 'object' && data !== null && 'error' in data ? String(data.error) : ''

      if (value) setShort(value)
      else setShortError(error || 'Не получилось сократить')
    } catch {
      setShortError('Сеть недоступна — попробуйте позже')
    } finally {
      setLoading(false)
    }
  }, [url])

  const copyShort = useCallback(async () => {
    if (!short) return
    try {
      await navigator.clipboard.writeText(short)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [short])

  const downloadPng = useCallback(() => {
    const canvas = boxRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'utmka-qr.png'
    link.click()
  }, [])

  /* SVG — паритет с 2.2: типографии просят вектор, растр на баннере рассыпается.
     Рядом с canvas держим скрытую векторную копию и сериализуем её. */
  const downloadSvg = useCallback(() => {
    const svg = boxRef.current?.querySelector('svg')
    if (!svg) return
    const markup = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>
${markup}`], {
      type: 'image/svg+xml;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'utmka-qr.svg'
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="linktools">
      <div className="result-row">
        <button type="button" className="btn btn--sm" onClick={() => setQrOpen((open) => !open)}>
          <PixelIcon name="qr" />
          {qrOpen ? 'Скрыть QR-код' : 'QR-код'}
        </button>
        <button type="button" className="btn btn--sm" onClick={shorten} disabled={loading}>
          <PixelIcon name="scissors" />
          {loading ? 'Сокращаю…' : 'Короткая ссылка'}
        </button>
      </div>

      {qrOpen ? (
        <div className="qrbox" ref={boxRef}>
          <QRCodeCanvas value={url} size={168} level="M" marginSize={2} />
          {/* Векторная копия того же кода — не показывается, нужна для выгрузки. */}
          <span className="sr-only" aria-hidden="true">
            <QRCodeSVG value={url} size={168} level="M" marginSize={2} />
          </span>
          <div className="qrbox-side">
            <p className="hint">
              Для листовок, витрин и упаковки. Метки внутри кода те же — переход из офлайна
              попадёт в отчёт.
            </p>
            <div className="result-row">
              <button type="button" className="btn btn--sm" onClick={downloadPng}>
                <PixelIcon name="save" />
                PNG
              </button>
              <button type="button" className="btn btn--sm" onClick={downloadSvg}>
                <PixelIcon name="save" />
                SVG
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {short ? (
        <div className="shortbox">
          <span className="shortbox-url">{short}</span>
          <button type="button" className="btn btn--sm" onClick={copyShort}>
            <PixelIcon name={copied ? 'check' : 'copy'} />
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
      ) : null}

      {shortError ? <p className="hint hint--error">{shortError}</p> : null}
    </div>
  )
}
