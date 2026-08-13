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
import { backendMessage } from '@utmka/core'

import { PixelIcon } from '../PixelIcon'
import { backend, saveFile } from '../../shell'
import { sayAbout } from '../../lib/mascot-lines'

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
      setShort(await backend.net.shorten(url))
      sayAbout('shorten')
    } catch (error) {
      setShortError(backendMessage(error))
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

  /* Файл кладёт оболочка: в окне Tauri `<a download>` ведёт себя не так, как в
     браузере, и выгрузка QR потерялась бы молча. Растр отдаём байтами. */
  const downloadPng = useCallback(async () => {
    const canvas = boxRef.current?.querySelector('canvas')
    if (!canvas) return
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    await saveFile('utmka-qr.png', 'image/png', new Uint8Array(await blob.arrayBuffer()))
    sayAbout('qr')
  }, [])

  /* SVG — паритет с 2.2: типографии просят вектор, растр на баннере рассыпается.
     Рядом с canvas держим скрытую векторную копию и сериализуем её. */
  const downloadSvg = useCallback(async () => {
    const svg = boxRef.current?.querySelector('svg')
    if (!svg) return
    const markup = new XMLSerializer().serializeToString(svg)
    await saveFile(
      'utmka-qr.svg',
      'image/svg+xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`,
    )
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
