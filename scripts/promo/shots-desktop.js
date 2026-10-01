// Снимки фронта десктопа в окне по умолчанию (1180×820) и у края минимума.
//
// Перед запуском: cd apps/desktop && npx vite build && npx vite preview --port 1421 --strictPort
// Мост Tauri подменён (tauri-mock.js), поэтому это проверка вёрстки, а не окна.
// `prep` в своём наборе — JS-выражение, оно выполняется на странице перед снимком.
const fs = require('fs')
const path = require('path')
const { playwright } = require('./pw.js')
const { installBridge } = require('./tauri-mock.js')

const BASE = process.env.BASE || 'http://localhost:1421/'
const OUT = path.join(process.env.OUT || path.join(__dirname, 'out'), 'shots')

const DEFAULT = [
  { name: 'desk-os-gen', w: 1180, h: 820, path: '/', theme: 'dark' },
  { name: 'desk-dots-gen', w: 1180, h: 820, path: '/', theme: 'light', skin: 'dots' },
  { name: 'desk-dotsdark-gen', w: 1180, h: 820, path: '/', theme: 'dark', skin: 'dots' },
  { name: 'desk-dots-batch', w: 1180, h: 820, path: '/batch', theme: 'light', skin: 'dots' },
  { name: 'desk-dots-history', w: 1180, h: 820, path: '/history', theme: 'light', skin: 'dots' },
  { name: 'desk-dots-templates', w: 1180, h: 820, path: '/templates', theme: 'light', skin: 'dots' },
  { name: 'desk-dots-900', w: 900, h: 680, path: '/', theme: 'light', skin: 'dots' },
]
const shots = process.env.SHOTS ? JSON.parse(process.env.SHOTS) : DEFAULT

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await playwright().chromium.launch()
  for (const s of shots) {
    const ctx = await b.newContext({ viewport: { width: s.w, height: s.h } })
    await installBridge(ctx, { theme: s.theme, skin: s.skin })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (e) => errs.push(e.message))
    await p.goto(BASE + '#' + s.path, { waitUntil: 'networkidle' })
    await p.waitForTimeout(900)
    if (s.prep) {
      await p.evaluate(s.prep)
      await p.waitForTimeout(500)
    }
    await p.screenshot({ path: path.join(OUT, s.name + '.png') })
    console.log(s.name, errs.length ? 'ОШИБКИ: ' + errs.slice(0, 3).join(' | ') : 'ok')
    await ctx.close()
  }
  await b.close()
})()
