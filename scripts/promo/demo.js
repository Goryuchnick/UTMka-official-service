// Демо-данные для ролика и снимков: поддельный бэкенд веба (вошёл, есть история,
// шаблоны, справочник, помощник). Ни одного настоящего адреса пользователя.
const now = Date.now();
const ago = (h) => new Date(now - h * 3600e3).toISOString();
const P = (s, m, c, extra = {}) => ({ source: s, medium: m, campaign: c, ...extra });
const H = [
  ['https://shop.example.ru/autumn', P('vk', 'social', 'osennyaya_rasprodazha'), 'ВК', '#e05080', 2, 'single'],
  ['https://shop.example.ru/autumn', P('yandex', 'cpc', 'osennyaya_rasprodazha', { term: '{keyword}' }), 'Директ', '#ffb000', 3, 'batch'],
  ['https://shop.example.ru/autumn', P('telegram', 'social', 'osennyaya_rasprodazha'), 'Телеграм', '#5be3d4', 3, 'batch'],
  ['https://shop.example.ru/autumn', P('email', 'email', 'osennyaya_rasprodazha', { content: 'header_button' }), 'Рассылка', '#40a040', 3, 'batch'],
  ['https://school.example.ru/kurs', P('vk', 'cpc', 'nabor_oktyabr'), 'ВК', '#e05080', 26, 'single'],
  ['https://school.example.ru/kurs', P('google', 'cpc', 'nabor_oktyabr', { term: '{keyword}' }), 'Google', '#5b8fb9', 27, 'brief'],
  ['https://cafe.example.ru/menu', P('qr', 'offline', 'stoly_veranda'), 'QR', '#8e8c7f', 50, 'single'],
].map(([base, params, tag, color, h, origin], i) => {
  const q = new URLSearchParams(Object.entries(params).map(([k, v]) => ['utm_' + k, v])).toString().replace(/%7B/g, '{').replace(/%7D/g, '}');
  return { id: 'h' + i, url: base + '?' + q, baseUrl: base, params, tagName: tag, tagColor: color, origin, createdAt: ago(h) };
});
const T = [
  { id: 't1', name: 'ВК — посев', params: P('vk', 'social', ''), tagName: 'ВК', tagColor: '#e05080', createdAt: ago(100), updatedAt: ago(5) },
  { id: 't2', name: 'Директ — поиск', params: P('yandex', 'cpc', '', { term: '{keyword}', content: '{ad_id}' }), tagName: 'Директ', tagColor: '#ffb000', createdAt: ago(200), updatedAt: ago(30) },
  { id: 't3', name: 'Рассылка', params: P('email', 'email', ''), tagName: 'Рассылка', tagColor: '#40a040', createdAt: ago(300), updatedAt: ago(60) },
  { id: 't4', name: 'Телеграм-канал', params: P('telegram', 'social', ''), tagName: 'Телеграм', tagColor: '#5be3d4', createdAt: ago(400), updatedAt: ago(90) },
];
const D = [
  { kind: 'source', value: 'vk', count: 14 }, { kind: 'source', value: 'yandex', count: 9 }, { kind: 'source', value: 'telegram', count: 6 },
  { kind: 'medium', value: 'social', count: 18 }, { kind: 'medium', value: 'cpc', count: 11 },
  { kind: 'campaign', value: 'osennyaya_rasprodazha', count: 5 },
];
async function mock(ctx, opts = {}) {
  await ctx.route('**/api/**', async (route) => {
    const u = new URL(route.request().url()); const m = route.request().method();
    const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (u.pathname === '/api/session') return json({ user: opts.guest ? null : { id: 'demo' }, storage: true });
    if (u.pathname === '/api/history') return m === 'GET' ? json({ items: H }) : json({ item: H[0] });
    if (u.pathname === '/api/templates') return m === 'GET' ? json({ items: T }) : json({ item: T[0] });
    if (u.pathname === '/api/dictionary') return json({ items: D });
    if (u.pathname === '/api/shorten') return json({ short: 'https://clck.ru/3Fq7xN' });
    if (u.pathname === '/api/assistant/brief') {
      if (m === 'GET') return json({ available: true, left: 9, limit: 10 });
      await new Promise((r) => setTimeout(r, opts.briefDelay ?? 1200));
      const L = [['vk', 'social', 'ВКонтакте', 0], ['telegram', 'social', 'Телеграм', 1], ['yandex', 'cpc', 'Яндекс Директ', 0], ['email', 'email', 'Рассылка', 0]];
      return json({ left: 8, limit: 10, dropped: [], links: L.map(([s, md, platform, fixed]) => ({ platform, fixed, params: { source: s, medium: md, campaign: 'osennyaya_rasprodazha' }, url: `https://shop.example.ru/autumn?utm_source=${s}&utm_medium=${md}&utm_campaign=osennyaya_rasprodazha${md === 'cpc' ? '&utm_term={keyword}' : ''}`, issues: [] })) });
    }
    return route.continue();
  });
}
async function prep(ctx, theme, skin) {
  await ctx.addInitScript(([t, s]) => {
    localStorage.setItem('utmka.consent.v1', 'denied'); localStorage.setItem('utmka.onboarding.v2', '1');
    localStorage.setItem('utmka.theme', t); if (s) localStorage.setItem('utmka.skin', s); else localStorage.removeItem('utmka.skin');
  }, [theme, skin]);
  // Плашка дев-сервера Next в кадре не нужна. На момент init-скрипта <head> ещё нет.
  await ctx.addInitScript(() => {
    const hide = () => { const st = document.createElement('style'); st.textContent = 'nextjs-portal{display:none!important}'; document.head.appendChild(st); };
    if (document.head) hide(); else document.addEventListener('DOMContentLoaded', hide);
  });
}
module.exports = { mock, prep, H, T, D };
