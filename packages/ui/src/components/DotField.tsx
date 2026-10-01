'use client'

/**
 * DotField — поле точек за интерфейсом в оформлении «Точки».
 *
 * Порт приёма со страниц сайта для бизнеса (docs/prototypes/_src/biz/app.js):
 * неподвижная сетка с шагом 20 px, точки набухают в цвет подсветки раздела
 * там, где человек сейчас работает. Рамок в оформлении нет, поэтому «где я»
 * показывает свет, а не обводка:
 *
 * - возле курсора;
 * - вокруг поля, в котором стоит фокус, а при наборе от него расходится круг;
 * - в колонке помощника справа — тихая волна, как у зоны разговора на сайте.
 *
 * Под текстом поле не вырубается, а размывается в мягкое пятно: жёстких граней
 * нет. Где лежит текст, пересчитывается не на каждом кадре, а по прокрутке,
 * ресайзу и изменениям разметки — с запасом в четверть секунды.
 *
 * Чистая декорация: `aria-hidden`, без pointer-events. При
 * `prefers-reduced-motion` волн и импульсов нет, свет встаёт без инерции.
 */

import { useEffect, useRef } from 'react'

const PITCH = 20

/** Блоки с текстом: под ними точки расплываются. */
const VEIL = [
  '.topbar > *',
  '.bubble',
  '.statusbar > *',
  '.screen-scroll :is(h1, h2, h3, p, label, li, summary, .qhead, .field, .step-done, .tile, .issue, .result, .explain, .hist-row, .htable-row, .area, .batch-row, .chips, .param, .hop, .verdict, .lp-item, .dict-item)',
  '.ask',
].join(', ')

interface Lamp {
  x: number
  y: number
  rx: number
  ry: number
  k: number
}

export function DotField() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wide = window.matchMedia('(min-width: 1200px)')

    let W = 0
    let H = 0
    let cols = 0
    let rows = 0
    let occ = new Float32Array(0)
    let tmp = new Float32Array(0)
    let soft = new Float32Array(0)

    const ptr: Lamp = { x: -300, y: -300, rx: 80, ry: 80, k: 0 }
    const focus: Lamp = { x: -300, y: -300, rx: 220, ry: 70, k: 0 }
    const side: Lamp = { x: -300, y: 0, rx: 190, ry: 120, k: 0 }
    let ptrX = -300
    let ptrY = -300
    let ptrAt = -1e6
    const pulses: { x: number; y: number; t: number }[] = []
    const zone = { on: false, x0: 0, x1: 0, ox: 0, oy: 0 }

    let ink = '21,20,15'
    let inkAlpha = 0.14
    let acc = '0,147,153'

    const readColors = () => {
      const style = getComputedStyle(document.querySelector('.dev') ?? document.documentElement)
      acc = style.getPropertyValue('--acc').trim() || acc
      ink = style.getPropertyValue('--dot-ink').trim() || ink
      inkAlpha = Number(style.getPropertyValue('--dot-alpha').trim()) || inkAlpha
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(W / PITCH) + 1
      rows = Math.ceil(H / PITCH) + 1
      occ = new Float32Array(cols * rows)
      tmp = new Float32Array(cols * rows)
      soft = new Float32Array(cols * rows)
      veil()
    }

    /** Усреднение по соседям 3×3 — край блока плавный на три-четыре точки. */
    const smooth = (a: Float32Array, b: Float32Array) => {
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          let sum = 0
          let n = 0
          for (let dj = -1; dj <= 1; dj++)
            for (let di = -1; di <= 1; di++) {
              const jj = j + dj
              const ii = i + di
              if (jj < 0 || ii < 0 || jj >= rows || ii >= cols) continue
              sum += a[jj * cols + ii]
              n++
            }
          b[j * cols + i] = sum / n
        }
    }

    const veil = () => {
      occ.fill(0)
      document.querySelectorAll(VEIL).forEach((el) => {
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height || r.bottom < 0 || r.top > H) return
        const c0 = Math.max(0, Math.floor((r.left - 8) / PITCH))
        const c1 = Math.min(cols - 1, Math.floor((r.right + 8) / PITCH))
        const r0 = Math.max(0, Math.floor((r.top - 4) / PITCH))
        const r1 = Math.min(rows - 1, Math.floor((r.bottom + 4) / PITCH))
        for (let j = r0; j <= r1; j++) occ.fill(1, j * cols + c0, j * cols + c1 + 1)
      })
      smooth(occ, tmp)
      smooth(tmp, soft)
      readColors()
    }

    let veilTimer = 0
    const schedule = () => {
      if (veilTimer) return
      veilTimer = window.setTimeout(() => {
        veilTimer = 0
        veil()
      }, 240)
    }

    const move = (L: Lamp, x: number, y: number, s = 0.14) => {
      if (reduced) {
        L.x = x
        L.y = y
      } else {
        L.x += (x - L.x) * s
        L.y += (y - L.y) * s
      }
    }
    const ease = (L: Lamp, v: number, s = 0.08) => {
      L.k += (v - L.k) * (reduced ? 1 : s)
    }

    const aim = (now: number) => {
      move(ptr, ptrX, ptrY, 0.28)
      ease(ptr, now - ptrAt > 1400 ? 0 : 0.36)

      const active = document.activeElement
      const field = active?.closest('.input, .area, .datebound, textarea') ?? null
      if (field) {
        const r = field.getBoundingClientRect()
        move(focus, r.left + Math.min(r.width, 420) * 0.4, r.bottom + 18)
        focus.rx = Math.max(160, Math.min(r.width, 420) * 0.7)
        ease(focus, 0.55)
      } else ease(focus, 0)

      const aside = document.querySelector('.mascotbar')
      const r = aside?.getBoundingClientRect()
      if (wide.matches && r && r.width > 0) {
        Object.assign(zone, { on: true, x0: r.left - 40, x1: r.right + 20, ox: r.left + r.width * 0.36, oy: r.top + 120 })
        move(side, r.left + r.width * 0.36, r.top + 120)
        ease(side, 0.32 + (reduced ? 0 : 0.08 * Math.sin(now / 1500)))
      } else {
        zone.on = false
        ease(side, 0)
      }

      while (pulses.length && now - pulses[0].t > 2600) pulses.shift()
    }

    /** Своя, более живая подсветка колонки помощника: волна от маскота. */
    const zoneGlow = (x: number, y: number, now: number) => {
      if (!zone.on || x < zone.x0 || x > zone.x1) return 0
      const edge = Math.min(1, (x - zone.x0) / 80, (zone.x1 - x) / 50)
      const dx = x - zone.ox
      const dy = y - zone.oy
      const d = Math.sqrt(dx * dx + dy * dy)
      const fall = Math.exp(-d / 520) * edge
      if (reduced) return 0.12 * fall
      const w = 0.5 + 0.5 * Math.sin(d / 40 - now / 620)
      return 0.28 * (0.3 + 0.7 * w * w * w) * fall
    }

    const sprite = document.createElement('canvas')
    const sctx = sprite.getContext('2d')!
    sprite.width = sprite.height = 64
    let spriteKey = ''
    const glow = (rgb: string) => {
      if (rgb === spriteKey) return
      spriteKey = rgb
      const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, `rgba(${rgb},1)`)
      g.addColorStop(0.3, `rgba(${rgb},.58)`)
      g.addColorStop(0.65, `rgba(${rgb},.14)`)
      g.addColorStop(1, `rgba(${rgb},0)`)
      sctx.clearRect(0, 0, 64, 64)
      sctx.fillStyle = g
      sctx.fillRect(0, 0, 64, 64)
    }

    const lit: number[] = []
    const haze: number[] = []

    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H)
      const lamps = [ptr, focus, side].filter((l) => l.k > 0.01)
      lit.length = 0
      haze.length = 0
      ctx.fillStyle = `rgba(${ink},${inkAlpha})`
      ctx.beginPath()
      for (let j = 0; j < rows; j++) {
        const y = j * PITCH + 10
        for (let i = 0; i < cols; i++) {
          const s = soft[j * cols + i]
          const x = i * PITCH + 10
          let b = zoneGlow(x, y, now)
          for (const l of lamps) {
            const dx = (x - l.x) / l.rx
            const dy = (y - l.y) / l.ry
            const d = dx * dx + dy * dy
            if (d < 4) b += l.k * Math.exp(-d * 1.6)
          }
          for (const p of pulses) {
            const t = now - p.t
            const dx = x - p.x
            const dy = y - p.y
            const q = (Math.sqrt(dx * dx + dy * dy) - t * 0.5) / 26
            b += 0.6 * Math.exp(-q * q) * Math.exp(-t / 800)
          }
          if (b < 0.05) {
            const d = 1.8 * (1 - s)
            if (d > 0.15) ctx.rect(x - d / 2, y - d / 2, d, d)
          } else if (s < 0.08) lit.push(x, y, Math.min(1, b))
          else haze.push(x, y, Math.min(1, b), s)
        }
      }
      ctx.fill()
      for (let n = 0; n < lit.length; n += 3) {
        const b = lit[n + 2]
        ctx.fillStyle = `rgba(${acc},${(0.22 + 0.68 * b).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(lit[n], lit[n + 1], 0.9 + 3.5 * Math.pow(b, 0.8), 0, Math.PI * 2)
        ctx.fill()
      }
      if (!haze.length) return
      glow(acc)
      for (let n = 0; n < haze.length; n += 4) {
        const b = haze[n + 2]
        const s = haze[n + 3]
        const r = (0.9 + 3.5 * Math.pow(b, 0.8)) * (1 + 3.2 * s) * 1.8
        ctx.globalAlpha = (0.22 + 0.68 * b) * (1 - 0.86 * s)
        ctx.drawImage(sprite, haze[n] - r, haze[n + 1] - r, r * 2, r * 2)
      }
      ctx.globalAlpha = 1
    }

    let frame = 0
    const tick = (now: number) => {
      aim(now)
      draw(now)
      frame = requestAnimationFrame(tick)
    }

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      ptrX = event.clientX
      ptrY = event.clientY
      ptrAt = performance.now()
    }
    /* Набор в поле — одиночный круг от поля: видно, что инструмент слушает. */
    let lastPulse = 0
    const onInput = (event: Event) => {
      const now = performance.now()
      if (reduced || now - lastPulse < 420) return
      const el = (event.target as Element | null)?.closest('.input, .area, textarea')
      if (!el) return
      const r = el.getBoundingClientRect()
      pulses.push({ x: r.left + Math.min(r.width, 420) * 0.4, y: r.top + r.height / 2, t: now })
      lastPulse = now
    }

    resize()
    frame = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('scroll', schedule, { capture: true, passive: true })
    document.addEventListener('input', onInput, true)
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-theme', 'data-accent', 'class'] })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(veilTimer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('scroll', schedule, { capture: true })
      document.removeEventListener('input', onInput, true)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={ref} className="dotfield" aria-hidden="true" />
}
