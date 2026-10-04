// Запись ролика по кадрам: сцена (stage.html или ad.html), внутри — настоящее
// приложение с localhost:3000 во фреймах. Время виртуальное (shim.js), поэтому
// каждый кадр снимается, когда сцена до него дошла, и запись не зависит от
// скорости машины.
//
// Сцена сама решает, какие фреймы ей нужны (`window.__load()`), и готовит их
// после загрузки (`window.__prep()`). Команды сцены приходят через
// `window.__cmds`: `click` и `key` — настоящие события Playwright (старая
// сцена), остальные — звуковые метки для audio-скрипта.
const fs = require('fs')
const path = require('path')
const { playwright } = require('./pw.js')
const { mock } = require('./demo.js')

const DIR = __dirname
const OUT = process.env.OUT || path.join(DIR, 'out')
const FRAMES = path.join(OUT, 'frames')
const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
const FONTS = path.join(DIR, '../../packages/ui/src/styles/fonts')
const FPS = +(process.env.FPS || 30)
const MAXF = +(process.env.MAXF || 1500)
const STAGE = process.env.STAGE || 'stage.html'
/** h — 1920×1080, v — 1080×1920 (Reels, Shorts, Клипы). */
const FMT = process.env.FMT === 'v' ? 'v' : 'h'
/** Плотность снимка: 2 даёт чёткий текст на увеличенных фрагментах, render.js сжимает обратно. */
const DPR = +(process.env.DPR || 1)
const [W, H] = FMT === 'v' ? [1080, 1920] : [1920, 1080]

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

;(async () => {
  fs.rmSync(FRAMES, { recursive: true, force: true })
  fs.mkdirSync(FRAMES, { recursive: true })
  const b = await playwright().chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] })
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR })
  await mock(ctx, { briefDelay: +(process.env.BRIEF_DELAY || 0) })

  // Сцена отдаётся с того же адреса, что приложение, а CSP с документов
  // снимается: `frame-ancestors 'none'` не пускает приложение во фрейм.
  await ctx.route(new RegExp('^' + escape(BASE) + '/(?!api/)'), async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname.startsWith('/__stage/')) {
      const name = u.pathname.slice('/__stage/'.length) || 'stage.html'
      const font = name.endsWith('.woff2')
      const file = path.join(font ? FONTS : DIR, path.basename(name))
      const type = font ? 'font/woff2' : 'text/html; charset=utf-8'
      return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file) })
    }
    if (route.request().resourceType() !== 'document') return route.continue()
    const r = await route.fetch()
    const h = { ...r.headers() }
    delete h['content-security-policy']
    delete h['x-frame-options']
    return route.fulfill({ response: r, headers: h })
  })
  await ctx.addInitScript({ path: path.join(DIR, 'shim.js') })
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('utmka.consent.v1', 'denied')
      localStorage.setItem('utmka.onboarding.v2', '1')
      localStorage.setItem('utmka.theme', 'light')
      localStorage.setItem('utmka.skin', 'dots')
    } catch (e) {}
    // Буфер обмена в безголовом браузере без жеста пользователя отказывает,
    // и кнопка «Скопировать» не доходила бы до «Скопировано».
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve(), readText: () => Promise.resolve('') },
      })
    } catch (e) {}
  })

  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 200))
  })
  await page.goto(`${BASE}/__stage/${STAGE}?fmt=${FMT}`)
  await page.evaluate(() => window.__load())

  // Фреймы грузятся в реальном времени, а виртуальное стоит — продвигаем понемногу.
  for (let i = 0; i < 300; i++) {
    const ready = await page.evaluate(() =>
      [...document.querySelectorAll('iframe')].every((f) => f.contentDocument?.querySelector('.dev') && f.contentWindow.__vt),
    )
    if (ready) break
    await page.evaluate(() => {
      for (const f of document.querySelectorAll('iframe')) f.contentWindow.__vt?.advance(16)
    })
    await page.waitForTimeout(50)
  }
  await page.evaluate(() => window.__prep && window.__prep())
  // Прогрев фреймов: шрифты, гидрация, данные из подменённого /api.
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => {
      for (const f of document.querySelectorAll('iframe')) f.contentWindow.__vt?.advance(33)
    })
    await page.waitForTimeout(30)
  }
  await page.evaluate(() => document.fonts.ready.then(() => 0))
  console.log('фреймы готовы')

  const cdp = await ctx.newCDPSession(page)
  // Сценарий не ждём: он живёт в виртуальном времени и закончится, только
  // когда кадры его прокрутят.
  await page.evaluate(() => {
    window.__start().catch((e) => console.error('сценарий', e.message, e.stack))
    return 0
  })

  const dt = 1000 / FPS
  const events = []
  let written = 0
  for (let f = 0; f < MAXF; f++) {
    await page.evaluate((dt) => {
      window.__vt.advance(dt)
      for (const fr of document.querySelectorAll('iframe')) fr.contentWindow.__vt?.advance(dt)
    }, dt)
    const { cmds, cur, done } = await page.evaluate(() => ({ cmds: window.__cmds.splice(0), cur: window.__cursor, done: window.__done }))
    await page.mouse.move(cur.x, cur.y)
    for (const c of cmds) {
      events.push({ f, ...c })
      if (c.type === 'click') {
        await page.mouse.down()
        await page.mouse.up()
      } else if (c.type === 'key') await page.keyboard.type(c.text)
    }
    await page.waitForTimeout(12)
    await page.evaluate(() => {
      window.__vt.sync()
      for (const fr of document.querySelectorAll('iframe')) fr.contentWindow.__vt?.sync()
    })
    // Без clip.scale снимок при эмуляции плотности приходит в CSS-пикселях — двойная плотность терялась.
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: W, height: H, scale: DPR } })
    fs.writeFileSync(path.join(FRAMES, String(f).padStart(5, '0') + '.jpg'), Buffer.from(shot.data, 'base64'))
    written++
    if (f % 60 === 0) console.log('кадр', f)
    if (done) break
  }
  console.log('кадров', written)
  fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(events))
  await b.close()
})()
