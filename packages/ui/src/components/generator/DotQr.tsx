'use client'

/**
 * DotQr — экранный QR «Простого» вида: модули кругами, как в роликах.
 *
 * Матрицу считает тот же `qrcode.react`: скрытая SVG-копия без полей, путь
 * которой разбирается на модули (формат `M x y h w v1 H x z` на каждую
 * тёмную серию в строке). Так код остаётся ровно тем, что уезжает в файл.
 *
 * ⚠️ Три угловых «глаза» и выравнивающие узоры рисуются сплошными
 * квадратами. На одних круглых точках сканер их не находит — проверено
 * декодером по кадрам роликов F1 и C.
 * Выгрузка SVG и PNG остаётся квадратной: печать — не место для опытов.
 */

import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Matrix {
  size: number
  dark: Uint8Array
}

/** Тихая зона на экране, в модулях. Как у прежнего экранного кода. */
const QUIET = 2

function readMatrix(svg: SVGSVGElement | null): Matrix | null {
  const paths = svg?.querySelectorAll('path')
  const size = Number(svg?.getAttribute('viewBox')?.split(/\s+/)[2])
  if (!paths || paths.length < 2 || !size) return null
  const dark = new Uint8Array(size * size)
  for (const m of (paths[1].getAttribute('d') ?? '').matchAll(/M\s*(\d+)[ ,]\s*(\d+)\s*h\s*(\d+)/g)) {
    const x = Number(m[1])
    const y = Number(m[2])
    for (let k = 0; k < Number(m[3]); k++) dark[y * size + x + k] = 1
  }
  return { size, dark }
}

/** Модуль внутри одного из трёх поисковых узоров 7×7. */
function inEye(row: number, col: number, size: number): boolean {
  const near = (v: number) => v < 7
  const far = (v: number) => v >= size - 7
  return (near(row) && near(col)) || (near(row) && far(col)) || (far(row) && near(col))
}

/**
 * Центры выравнивающих узоров 5×5 — по спецификации QR (расчёт как в
 * qrcodegen, на котором стоит `qrcode.react`). У версии 1 их нет.
 */
function alignCenters(size: number): number[] {
  const version = (size - 17) / 4
  if (version < 2) return []
  const count = Math.floor(version / 7) + 2
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2
  const result = [6]
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos)
  return result
}

function inAlign(row: number, col: number, centers: number[]): boolean {
  const last = centers[centers.length - 1]
  return centers.some((r) =>
    centers.some((c) => {
      // Три угла заняты «глазами» — узоров там нет.
      if ((r === 6 && c === 6) || (r === 6 && c === last) || (r === last && c === 6)) return false
      return Math.abs(row - r) <= 2 && Math.abs(col - c) <= 2
    }),
  )
}

export function DotQr({ url, size }: { url: string; size: number }) {
  const sourceRef = useRef<HTMLSpanElement>(null)
  const [matrix, setMatrix] = useState<Matrix | null>(null)

  useLayoutEffect(() => {
    setMatrix(readMatrix(sourceRef.current?.querySelector('svg') ?? null))
  }, [url])

  const n = matrix?.size ?? 0
  const centers = alignCenters(n)
  const dots: ReactElement[] = []
  if (matrix) {
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (!matrix.dark[row * n + col]) continue
        dots.push(
          inEye(row, col, n) || inAlign(row, col, centers) ? (
            <rect key={`${row}-${col}`} x={col} y={row} width={1.02} height={1.02} />
          ) : (
            <circle key={`${row}-${col}`} cx={col + 0.5} cy={row + 0.5} r={0.43} />
          ),
        )
      }
    }
  }

  return (
    <>
      <span className="sr-only" aria-hidden="true" ref={sourceRef}>
        <QRCodeSVG value={url} level="M" marginSize={0} />
      </span>
      {matrix ? (
        <svg
          className="dotqr"
          width={size}
          height={size}
          viewBox={`${-QUIET} ${-QUIET} ${n + QUIET * 2} ${n + QUIET * 2}`}
          role="img"
          aria-label="QR-код ссылки"
        >
          <rect x={-QUIET} y={-QUIET} width={n + QUIET * 2} height={n + QUIET * 2} rx={1.6} fill="#ffffff" />
          <g fill="#15140f">{dots}</g>
        </svg>
      ) : null}
    </>
  )
}
