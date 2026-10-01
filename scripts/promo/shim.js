// Виртуальное время: кадр за кадром, детерминированно. Ставится в каждый фрейм.
(() => {
  if (window.__vt) return;
  const realNow = performance.now.bind(performance);
  const realDateNow = Date.now.bind(Date);
  const t0real = realDateNow();
  let now = 0; // virtual ms since start
  let seq = 0;
  const timers = new Map(); // id -> {at, fn, args, every}
  let rafs = new Map();
  performance.now = () => now;
  Date.now = () => t0real + now;
  const RD = Date;
  // new Date() без аргументов — тоже виртуальное
  window.Date = class extends RD { constructor(...a) { if (a.length === 0) super(t0real + now); else super(...a); } static now() { return t0real + now; } };
  window.setTimeout = (fn, ms = 0, ...args) => { const id = ++seq; timers.set(id, { at: now + Math.max(0, +ms || 0), fn, args }); return id; };
  window.setInterval = (fn, ms = 0, ...args) => { const id = ++seq; timers.set(id, { at: now + Math.max(1, +ms || 0), fn, args, every: Math.max(1, +ms || 0) }); return id; };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  window.requestAnimationFrame = (fn) => { const id = ++seq; rafs.set(id, fn); return id; };
  window.cancelAnimationFrame = (id) => rafs.delete(id);
  const seen = new WeakMap();
  function syncAnims() {
    let list = [];
    try { list = document.getAnimations(); } catch (e) {}
    for (const a of list) {
      let st = seen.get(a);
      if (st === undefined) {
        const ct = a.currentTime || 0;
        st = now - ct / (a.playbackRate || 1);
        seen.set(a, st);
        // уважаем «пауза» самого приложения
        if (a.playState === 'paused') { seen.set(a, null); continue; }
      }
      if (st === null) continue;
      try { a.pause(); a.currentTime = (now - st) * (a.playbackRate || 1); } catch (e) {}
    }
  }
  function runTimers(limit) {
    for (let guard = 0; guard < 1000; guard++) {
      let best = null, bestId = 0;
      for (const [id, t] of timers) if (t.at <= limit && (!best || t.at < best.at)) { best = t; bestId = id; }
      if (!best) break;
      if (best.every) best.at += best.every; else timers.delete(bestId);
      try { typeof best.fn === 'function' ? best.fn(...best.args) : eval(best.fn); } catch (e) { console.error(e); }
    }
  }
  window.__vt = {
    get now() { return now; },
    advance(dt) {
      const target = now + dt;
      // таймеры по порядку внутри шага
      for (;;) {
        let next = Infinity;
        for (const t of timers.values()) if (t.at < next) next = t.at;
        if (next > target) break;
        now = Math.max(now, next);
        runTimers(now);
      }
      now = target;
      const cbs = rafs; rafs = new Map();
      for (const fn of cbs.values()) { try { fn(now); } catch (e) { console.error(e); } }
    },
    sync: syncAnims,
  };
})();
