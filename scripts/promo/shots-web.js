// Снимки веба: веб работает на :3000 (README), /api подменяет demo.js.
// Свой набор — через SHOTS: '[{"name":"x","w":1440,"h":900,"path":"/","theme":"light","skin":"dots"}]'
const fs = require('fs')
const path = require('path')
const { playwright } = require('./pw.js')
const { mock, prep } = require('./demo.js')

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
const OUT = path.join(process.env.OUT || path.join(__dirname, 'out'), 'shots')

const sections = ['/', '/batch', '/parse', '/history', '/templates']
const DEFAULT = [
  ...sections.map((p) => ({ name: 'web-dots' + (p.slice(1) || '-gen'), w: 1440, h: 900, path: p, theme: 'light', skin: 'dots' })),
  { name: 'web-dotsdark-gen', w: 1440, h: 900, path: '/', theme: 'dark', skin: 'dots' },
  { name: 'web-os-gen', w: 1440, h: 900, path: '/', theme: 'dark' },
  { name: 'web-dots-1180', w: 1180, h: 820, path: '/', theme: 'light', skin: 'dots' },
  { name: 'web-dots-390', w: 390, h: 844, path: '/', theme: 'light', skin: 'dots', mobile: true, dpr: 2 },
]
const shots = process.env.SHOTS ? JSON.parse(process.env.SHOTS) : DEFAULT

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await playwright().chromium.launch()
  for (const s of shots) {
    const ctx = await b.newContext({
      viewport: { width: s.w, height: s.h },
      deviceScaleFactor: s.dpr || 1,
      isMobile: !!s.mobile,
      hasTouch: !!s.mobile,
    })
    await mock(ctx)
    await prep(ctx, s.theme, s.skin)
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (e) => errs.push(e.message))
    await p.goto(BASE + s.path, { waitUntil: 'networkidle' })
    await p.waitForTimeout(900)
    await p.screenshot({ path: path.join(OUT, s.name + '.png') })
    console.log(s.name, errs.length ? 'ОШИБКИ: ' + errs.join(' | ') : 'ok')
    await ctx.close()
  }
  await b.close()
})()
