'use client'

/**
 * LinkTools — QR-код и короткая ссылка для готовой ссылки.
 *
 * Обе функции были в 2.2 и обязаны доехать (ARCHITECTURE §4.1): QR с выгрузкой
 * в PNG и SVG, сокращение через clck.ru. Живут прямо под результатом —
 * там, где ссылка уже собрана.
 *
 * ⚠️ Выгружается НЕ тот код, что на экране. Экранный нарисован в 168 пикселей —
 * этого хватает, чтобы навести телефон, и мало для всего остального: печать с
 * такого растра рассыпается. Поэтому рядом висит скрытая пара копий на 1024
 * пикселя и с тихой зоной в 4 модуля (её требует спецификация QR; на экране
 * зона урезана ради компактности). Вектор при этом главный: макет для
 * типографии, наружной рекламы и упаковки берут в SVG, а растр остаётся для
 * презентации и письма.
 */

import { useCallback, useRef, useState } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { backendMessage } from '@utmka/core'

import { PixelIcon } from '../PixelIcon'
import { backend, saveFile } from '../../shell'
import { sayAbout } from '../../lib/mascot-lines'

/** Сторона кода на экране: столько нужно, чтобы навести телефон. */
const SCREEN_SIZE = 168

/**
 * Сторона выгружаемого кода в пикселях.
 *
 * 1024 — это ~8,7 см при 300 dpi: хватает и на листовку, и на витрину. В 2.2
 * растр отдавался в 600, но там он и рисовался отдельно от экранного, а здесь
 * дешевле сразу взять с запасом: лишний вес PNG — десятки килобайт.
 */
const EXPORT_SIZE = 1024

/** Тихая зона по спецификации QR — 4 модуля. Без неё сканеры теряют код. */
const EXPORT_MARGIN = 4

interface LinkToolsProps {
  url: string
}

export function LinkTools({ url }: LinkToolsProps) {
  const [qrOpen, setQrOpen] = useState(false)
  /* Короткая ссылка помнит, для какой ссылки её выдали. Иначе после правки
     результата под новой ссылкой оставалась бы висеть старая короткая — она
     ведёт на прежний адрес, и это ровно тот случай, когда ошибка обнаружится
     уже в отчёте. Сравнением, а не эффектом: сбрасывать состояние в эффекте —
     лишний кадр и лишний повод для гонки. */
  const [short, setShort] = useState<{ made: string; url: string } | null>(null)
  const [shortError, setShortError] = useState<{ made: string; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  /** Скрытая пара копий под выгрузку — из неё и берутся файлы. */
  const exportRef = useRef<HTMLSpanElement>(null)

  const shorten = useCallback(async () => {
    setLoading(true)
    setShortError(null)
    try {
      setShort({ made: url, url: await backend.net.shorten(url) })
      sayAbout('shorten')
    } catch (error) {
      setShortError({ made: url, text: backendMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [url])

  const copyShort = useCallback(async () => {
    if (!short) return
    try {
      await navigator.clipboard.writeText(short.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [short])

  /* SVG — главный формат: в макет идёт вектор, он не зависит от размера, в
     который его потом поставят. Сериализуем скрытую копию.

     `XMLSerializer` сам дописывает `xmlns` (элемент лежит в SVG-пространстве
     имён), но объявление документа — нет: без него часть редакторов и
     типографских конвейеров считает файл битым. */
  const downloadSvg = useCallback(async () => {
    const svg = exportRef.current?.querySelector('svg')
    if (!svg) return
    const markup = new XMLSerializer().serializeToString(svg)
    await saveFile(
      'utmka-qr.svg',
      'image/svg+xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n${markup}\n`,
    )
    sayAbout('qr')
  }, [])

  /* Файл кладёт оболочка: в окне Tauri `<a download>` ведёт себя не так, как в
     браузере, и выгрузка QR потерялась бы молча. Растр отдаём байтами. */
  const downloadPng = useCallback(async () => {
    const canvas = exportRef.current?.querySelector('canvas')
    if (!canvas) return
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    await saveFile('utmka-qr.png', 'image/png', new Uint8Array(await blob.arrayBuffer()))
    sayAbout('qr')
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
        <div className="qrbox">
          <QRCodeCanvas value={url} size={SCREEN_SIZE} level="M" marginSize={2} />

          {/* Копии под выгрузку: крупные, с полной тихой зоной. На экране их
              нет, но именно они уезжают в файл. */}
          <span className="sr-only" aria-hidden="true" ref={exportRef}>
            <QRCodeSVG value={url} size={EXPORT_SIZE} level="M" marginSize={EXPORT_MARGIN} />
            <QRCodeCanvas value={url} size={EXPORT_SIZE} level="M" marginSize={EXPORT_MARGIN} />
          </span>

          <div className="qrbox-side">
            <p className="hint">
              Для листовок, витрин и упаковки. Метки внутри кода те же — переход из офлайна
              попадёт в отчёт.
            </p>
            <div className="result-row">
              <button type="button" className="btn btn--sm" onClick={downloadSvg}>
                <PixelIcon name="save" />
                SVG
              </button>
              <button type="button" className="btn btn--sm" onClick={downloadPng}>
                <PixelIcon name="save" />
                PNG
              </button>
            </div>
            {/* Разница между форматами стоит одной строки: печатник просит
                вектор, и человек не должен угадывать это сам. */}
            <p className="hint">
              SVG — в макет и в типографию, не рассыпается при увеличении. PNG — {EXPORT_SIZE}{' '}
              пикселей, для презентации и письма.
            </p>
          </div>
        </div>
      ) : null}

      {short?.made === url ? (
        <div className="shortbox">
          <span className="shortbox-url">{short.url}</span>
          <button type="button" className="btn btn--sm" onClick={copyShort}>
            <PixelIcon name={copied ? 'check' : 'copy'} />
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
      ) : null}

      {shortError?.made === url ? <p className="hint hint--error">{shortError.text}</p> : null}
    </div>
  )
}
