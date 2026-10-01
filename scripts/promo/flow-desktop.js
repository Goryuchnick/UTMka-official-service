// Проход по генератору в окне десктопа: третий шаг с уточнениями и
// подстановками площадок, готовая ссылка и её правка. Снимок на каждом шаге.
//
// Перед запуском — тот же vite preview, что для shots-desktop.js.
// Окно и вид: W, H, THEME, SKIN (пусто — «ПРОНИН-ОС»), TAG — префикс файлов.
const fs = require('fs')
const path = require('path')
const { playwright } = require('./pw.js')
const { installBridge } = require('./tauri-mock.js')

const BASE = process.env.BASE || 'http://localhost:1421/'
const OUT = path.join(process.env.OUT || path.join(__dirname, 'out'), 'shots')
const W = +(process.env.W || 1180)
const HH = +(process.env.H || 820)
const THEME = process.env.THEME || 'light'
const SKIN = process.env.SKIN ?? 'dots'
const TAG = process.env.TAG || 'flow-' + (SKIN || 'os')

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await playwright().chromium.launch()
  const ctx = await b.newContext({ viewport: { width: W, height: HH } })
  await installBridge(ctx, { theme: THEME, skin: SKIN })
  const p = await ctx.newPage()
  const shot = (name) => p.screenshot({ path: path.join(OUT, `${TAG}-${name}.png`) })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(BASE + '#/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(600)

  await p.fill('input[aria-label="Адрес страницы"]', 'shop.example.ru/autumn')
  await p.click('.step[data-state="now"] .btn--main')
  await p.waitForTimeout(300)
  // Директ — у него есть и уточнения, и подстановки.
  const direct = await p.$('.tile:has-text("Директ")')
  await (direct || (await p.$('.tile'))).click()
  await p.waitForTimeout(400)
  await p.fill('.step[data-state="now"] input', 'Осенняя распродажа')
  await p.waitForTimeout(400)
  await shot('step3')

  await p.evaluate(() => document.querySelector('.substep')?.scrollIntoView({ block: 'center' }))
  await p.waitForTimeout(300)
  await shot('substep')
  const macros = (await p.$('.substep .macros .ibtn')) || (await p.$('.macros .ibtn'))
  if (macros) {
    await macros.click()
    await p.waitForTimeout(400)
    await shot('macros')
    await p.keyboard.press('Escape')
    await p.mouse.click(5, 300)
    await p.waitForTimeout(200)
  }

  const fix = await p.$('.issue-fix')
  if (fix) {
    await fix.click()
    await p.waitForTimeout(200)
  }
  await p.click('.step[data-state="now"] .btn--main')
  await p.waitForTimeout(600)
  await p.evaluate(() => document.querySelector('.result')?.scrollIntoView({ block: 'center' }))
  await p.waitForTimeout(300)
  await shot('result')
  const edit = await p.$('.result button:has-text("Править")')
  if (edit) {
    await edit.click()
    await p.waitForTimeout(400)
    await shot('result-edit')
  }

  console.log(TAG, errs.length ? 'ОШИБКИ: ' + errs.join(' | ') : 'ok')
  await b.close()
})()
