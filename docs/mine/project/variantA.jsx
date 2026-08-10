// variantA.jsx — Home "Deep CRT" — углублённый терминал, amber + phosphor cyan
// Pac-man трекает по ASCII-имени, параллакс, 3D картриджи, scanlines, boot.

const NAME_LETTERS_A = [
  [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
  [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  [[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  [[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1]],
  [[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
];

const YEARS_A = [
  { y: '2012', tag: 'маркетинг', lv: 1, title: 'Маркетолог', text: 'Рекламные кампании, аналитика, первый digital. ATL/BTL связка.', tags: ['SMM','Аналитика','Стратегия'] },
  { y: '2015', tag: 'диджитал', lv: 2, title: 'Диджитал', text: 'Таргет, контекст, SEO. Первые воронки, A/B-тесты, Google Analytics.', tags: ['Таргет','SEO','A/B'] },
  { y: '2018', tag: 'рост',     lv: 3, title: 'Growth', text: 'Юнит-экономика, CJM. Системный подход к продвижению SaaS-продукта.', tags: ['Growth','CJM','Unit-эк'] },
  { y: '2020', tag: 'продукт',  lv: 4, title: 'PMM', text: 'B2B SaaS, запуски продуктов, позиционирование. Python для рутины.', tags: ['B2B','Launch','Python'] },
  { y: '2022', tag: 'автомат',  lv: 5, title: 'Автоматизация', text: 'No-code/low-code. n8n, Make, API-интеграции под маркетинговые команды.', tags: ['n8n','API','No-code'] },
  { y: '2023', tag: 'ИИ/код',   lv: 6, title: 'ИИ и разработка', text: 'Вайб-кодинг, AI-интеграции, собственные продукты на Next.js + TypeScript.', tags: ['LLM','Next.js','TS'] },
  { y: '2025', tag: 'продукт',  lv: 7, title: 'Now playing', text: 'AlpinaGPT, курс по ИИ для маркетологов, лаборатория идей.', tags: ['Alpina','Курс','Lab'] },
];

const PROJECTS_A = [
  { badge: 'PROD',   title: 'AI-ассистент школы', desc: 'Чат-бот на LLM для 20+ франчайзи. Сокращение ручных ответов на 60%.', tags: ['#AI','#ChatBot','#B2B'] },
  { badge: 'CASE',   title: 'AlpinaGPT',          desc: 'GTM-стратегия и лендинг для корпоративной подписки B2B.',             tags: ['#GTM','#Product','#B2B'] },
  { badge: 'OPEN',   title: 'UTMka Service',      desc: 'Open-source сервис генерации и аналитики UTM-меток.',               tags: ['#Python','#Tool','#OSS'] },
  { badge: 'LAB',    title: 'Нейросеть для CSV',  desc: 'Desktop-приложение для анализа табличных данных без кода.',         tags: ['#Cursor','#DS'] },
];

const BLOG_A = [
  { date: '21.04.26', title: 'Как мы уронили LLM-ассистент в проде и что поняли', read: '7 мин' },
  { date: '09.04.26', title: 'n8n для PMM: 6 рабочих автоматизаций без разработки', read: '5 мин' },
  { date: '28.03.26', title: 'Продуктовый маркетинг в эпоху no-code-конкурентов', read: '9 мин' },
];

function TiltCard({ children, style, intensity = 6 }) {
  const ref = React.useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * intensity}deg) rotateX(${-py * intensity}deg) translateY(-3px)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="pr-tiltCard" style={style}>
      {children}
    </div>
  );
}

// 3D Cartridge
function Cartridge3D({ y, tag, lv, active, dim, onClick }) {
  const ref = React.useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${-py * 14 + (active ? -4 : 6)}deg) rotateY(${px * 14}deg) translateZ(0) translateY(${active ? 14 : 0}px)`;
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = `perspective(700px) rotateX(${active ? -4 : 6}deg) rotateY(0deg) translateY(${active ? 14 : 0}px)`;
  };
  React.useEffect(() => { onLeave(); }, [active]);

  return (
    <button onClick={onClick}
      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
        width: 96, height: 128, perspective: 700, filter: dim ? 'brightness(0.5) saturate(.7)' : 'none',
        transition: 'filter .3s' }}>
      <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
        style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d', transition: 'transform .4s cubic-bezier(.2,.8,.3,1)',
          transform: `perspective(700px) rotateX(${active ? -4 : 6}deg) rotateY(0deg)`,
        }}>
        {/* notch */}
        <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
          width: 22, height: 6, borderRadius: '3px 3px 0 0',
          background: '#2a2820', border: `1.5px solid ${active ? TOKENS.primary : TOKENS.border}`,
          borderBottom: 'none' }} />
        {/* body */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '6px 6px 3px 3px',
          background: `linear-gradient(180deg, #2a2820 0%, #1e1e18 60%, #161612 100%)`,
          border: `2px solid ${active ? TOKENS.primary : TOKENS.border}`,
          boxShadow: active ? '0 0 14px rgba(255,176,0,.2), inset 0 -8px 16px rgba(0,0,0,.4)'
            : 'inset 0 -8px 16px rgba(0,0,0,.3), 0 4px 12px rgba(0,0,0,.5)',
          overflow: 'hidden',
        }}>
          {/* level badge */}
          <div style={{ position: 'absolute', top: 5, right: 5, width: 14, height: 14, fontSize: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
            border: `1px solid ${active ? TOKENS.primaryDim : TOKENS.border}`,
            color: active ? TOKENS.primary : TOKENS.muted, borderRadius: 2, background: TOKENS.card }}>
            {lv}
          </div>
          {/* label inset */}
          <div style={{ margin: '8px 6px 0', height: 66, borderRadius: 2,
            border: `1px solid ${active ? TOKENS.primaryDim : TOKENS.border}`,
            background: TOKENS.bg,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: TOKENS.primary, lineHeight: 1,
              textShadow: '0 0 8px rgba(255,176,0,.3)' }}>{y}</span>
            <span style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 1.5, color: TOKENS.muted, textAlign: 'center' }}>{tag}</span>
          </div>
          {/* grip lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 18px' }}>
            <div style={{ height: 1, background: TOKENS.border }} />
            <div style={{ height: 1, background: TOKENS.border }} />
            <div style={{ height: 1, background: TOKENS.border }} />
          </div>
          {/* pins */}
          <div style={{ position: 'absolute', bottom: 3, left: 16, right: 16, display: 'flex', gap: 2, justifyContent: 'center' }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ width: 3, height: 5, background: TOKENS.border2, borderRadius: 1 }} />)}
          </div>
        </div>
      </div>
    </button>
  );
}

// Hero with PacMan that TRACKS across the ASCII name
function HeroA() {
  const [phase, setPhase] = React.useState(0); // controls rotating subtitle
  const [lit, setLit] = React.useState(0);     // letters revealed
  const subtitles = [
    'Product Marketing · Automation · No-code',
    'Вайб-кодинг · LLM-продукты для бизнеса',
    'n8n · Next.js · TypeScript · AlpinaGPT',
  ];

  React.useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % subtitles.length), 4200);
    return () => clearInterval(id);
  }, []);
  React.useEffect(() => {
    setLit(0);
    const timers = NAME_LETTERS_A.map((_, i) => setTimeout(() => setLit(i + 1), 300 + i * 240));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  return (
    <div style={{ position: 'relative' }}>
      {/* status pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px',
          border: `1px solid ${TOKENS.border}`, borderRadius: 2, background: TOKENS.card,
          fontSize: 11, color: TOKENS.success, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          <span className="pr-ledDot" /> SYSTEM ONLINE · v3.5
        </span>
        <span style={{ fontSize: 11, color: TOKENS.subtle, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          [ KYIV → MOSCOW RELAY / 42ms ]
        </span>
        <span style={{ fontSize: 11, color: TOKENS.info, letterSpacing: 1.5, textTransform: 'uppercase', marginLeft: 'auto' }}>
          uptime 14 лет
        </span>
      </div>

      <Frame corners legend={<>экземпляр_кожаного_мешка.v2 <span style={{ color: TOKENS.subtle }}> · build 26.04.21</span></>}>
        {/* boot line */}
        <div style={{ fontSize: 12, color: TOKENS.muted, marginBottom: 10 }}>
          <span style={{ color: TOKENS.info }}>visitor@alex-pronin.ru</span>
          <span style={{ color: TOKENS.muted }}>:~$ </span>
          <TW text="load ./пронин --mode=retro --autorun" speed={28} cursor={false} />
        </div>

        {/* ASCII NAME with traveling pacman */}
        <div style={{ position: 'relative', padding: '18px 0 26px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(10px, 2vw, 22px)', flexWrap: 'nowrap' }}>
            {NAME_LETTERS_A.map((grid, i) => (
              <AsciiPixelLetter key={i} grid={grid} lit={i < lit} morph={i < lit ? 0 : 0.9}
                scale={13} color={i === 1 ? TOKENS.primary : TOKENS.primary} />
            ))}
          </div>
          {/* dots under letters being eaten */}
          <div style={{ display: 'flex', gap: 0, justifyContent: 'space-between', padding: '10px 6px 0', opacity: .55 }}>
            {Array.from({ length: 34 }).map((_, i) => (
              <span key={i} className="pr-pixelDot" style={{
                background: TOKENS.primary, width: 4, height: 4,
                animation: `pr-dotEat 4.2s linear ${i * 0.13}s infinite`,
              }} />
            ))}
          </div>
          {/* Pac-man traveling across */}
          <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, height: 16 }}>
            <div style={{
              position: 'absolute', left: `${(phase * 50 + 8) % 100}%`, bottom: 0,
              animation: 'pr-marquee 4.2s linear infinite',
            }}>
              <PixelPacman size={2.2} />
            </div>
          </div>
        </div>

        {/* rotating subtitle */}
        <div style={{ minHeight: 22, fontSize: 14, color: TOKENS.fg, opacity: .92 }} key={phase}>
          <span style={{ color: TOKENS.info }}>› </span>
          <span style={{ animation: 'pr-riseIn .5s ease-out' }}>{subtitles[phase]}</span>
        </div>

        {/* chip links */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            ['./портфолио/','/portfolio'],
            ['./о_себе/','/about'],
            ['./лаб/','/lab'],
            ['./блог/','/blog'],
            ['./курс.ии/','/course'],
          ].map(([label, href]) => (
            <Chip href={href} key={label}>
              <span style={{ color: TOKENS.primaryDim }}>[ </span>{label}<span style={{ color: TOKENS.primaryDim }}> ]</span>
            </Chip>
          ))}
        </div>
      </Frame>

      {/* search-like assistant bar */}
      <div style={{ marginTop: 12, padding: '10px 14px', border: `1px solid ${TOKENS.border}`,
        borderRadius: 6, background: TOKENS.card, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: TOKENS.primary, fontSize: 14 }}>❯</span>
        <TW text="спроси у сайта: «какой проект похож на мой кейс?»" speed={20} delay={1200} className="" />
        <span className="pr-cursor" />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <kbd style={{ fontSize: 10, padding: '2px 6px', border: `1px solid ${TOKENS.border}`, borderRadius: 2, color: TOKENS.muted }}>⌘</kbd>
          <kbd style={{ fontSize: 10, padding: '2px 6px', border: `1px solid ${TOKENS.border}`, borderRadius: 2, color: TOKENS.muted }}>K</kbd>
        </div>
      </div>
    </div>
  );
}

function TimelineA() {
  const [active, setActive] = React.useState(4); // "2022" by default selected to show console filled
  const current = YEARS_A[active];
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 14 }}>
        <span className="pr-prompt">история --карьера --format=cartridges</span>
      </div>
      {/* console */}
      <div style={{ background: '#1a1a16', borderRadius: 8, border: `2px solid ${TOKENS.border}`, overflow: 'hidden' }}>
        {/* top bar */}
        <div style={{
          background: 'linear-gradient(180deg,#242420,#1e1e1a)', borderBottom: `1px solid ${TOKENS.border}`,
          display: 'flex', alignItems: 'center', gap: 14, padding: '8px 18px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: TOKENS.primary, letterSpacing: 3, textTransform: 'uppercase' }}>ПРОНИН</span>
          <div style={{ width: 1, height: 12, background: TOKENS.border }} />
          <span style={{ fontSize: 10, color: TOKENS.subtle, letterSpacing: 2 }}>ХРОНО-БЛОК 3000</span>
          <div style={{ flex: 1 }} />
          <span className="pr-ledDot" />
          <span style={{ fontSize: 9, color: TOKENS.success, letterSpacing: 1, textTransform: 'uppercase' }}>Сеть</span>
        </div>
        {/* cart dock */}
        <div style={{ padding: '20px 18px 10px', position: 'relative',
          background: `radial-gradient(ellipse at top, rgba(255,176,0,.04), transparent 70%)` }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
            {YEARS_A.map((c, i) => (
              <Cartridge3D key={c.y} {...c} active={active === i} dim={active !== null && active !== i} onClick={() => setActive(i)} />
            ))}
          </div>
          {/* rail */}
          <div style={{ height: 4, background: '#080806', borderRadius: 2, border: `1px solid #0f0f0c`, borderTop: `2px solid #101010`, margin: '0 30px' }} />
        </div>
        {/* screen */}
        <div style={{ padding: '14px 18px 18px' }}>
          <div style={{
            background: '#060604', border: `2px solid ${TOKENS.border}`, borderRadius: 4,
            padding: '18px 20px', position: 'relative', minHeight: 120, overflow: 'hidden',
          }}>
            {/* scanlines */}
            <div style={{ position: 'absolute', inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.18) 2px, rgba(0,0,0,.18) 4px)',
              pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0,
              boxShadow: 'inset 0 0 80px rgba(255,176,0,.05)', pointerEvents: 'none' }} />
            {/* corner LEDs */}
            <div style={{ position: 'absolute', top: 6, left: 6, width: 4, height: 4, borderRadius: '50%',
              background: TOKENS.primary, boxShadow: '0 0 4px ' + TOKENS.primary, zIndex: 2 }} />
            <div style={{ position: 'absolute', top: 6, right: 6, width: 4, height: 4, borderRadius: '50%',
              background: TOKENS.primary, boxShadow: '0 0 4px ' + TOKENS.primary, zIndex: 2 }} />
            <div key={active} style={{ position: 'relative', animation: 'pr-riseIn .3s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8 }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: TOKENS.primaryDim }}>
                  LV {current.lv} · {current.y}
                </span>
                <span style={{ fontSize: 17, fontWeight: 600, color: TOKENS.primary }}>{current.title}</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: TOKENS.fg, opacity: .85, margin: 0, maxWidth: 600 }}>{current.text}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                {current.tags.map(t => <span key={t} className="pr-tag pr-tag--hi">{t}</span>)}
              </div>
            </div>
          </div>
        </div>
        {/* vents */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 3, padding: '4px 18px 8px' }}>
          {Array.from({ length: 18 }).map((_, i) => <div key={i} style={{ width: 24, height: 2, background: TOKENS.border, borderRadius: 1 }} />)}
        </div>
      </div>
    </div>
  );
}

function ProjectsA() {
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 14 }}>
        <span className="pr-prompt">ls ./проекты --sort=impact</span>
      </div>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
        {PROJECTS_A.map((p, i) => (
          <TiltCard key={p.title} style={{
            border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card,
            padding: '16px 18px', cursor: 'pointer', position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className={`pr-tag ${p.badge === 'PROD' ? 'pr-tag--hi' : p.badge === 'CASE' ? 'pr-tag--info' : ''}`}>{p.badge}</span>
              <h3 style={{ margin: 0, fontSize: 15, color: TOKENS.fg, fontWeight: 600 }}>{p.title}</h3>
              <span style={{ marginLeft: 'auto', color: TOKENS.muted, fontSize: 14 }}>↗</span>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: TOKENS.muted, lineHeight: 1.55 }}>{p.desc}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {p.tags.map(t => <span key={t} style={{ fontSize: 10, color: TOKENS.primaryDim }}>{t}</span>)}
            </div>
          </TiltCard>
        ))}
      </div>
    </div>
  );
}

function BlogA() {
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 14 }}>
        <span className="pr-prompt">cat ./блог/latest.md</span>
      </div>
      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card, overflow: 'hidden' }}>
        {BLOG_A.map((p, i) => (
          <a key={i} href="#" style={{
            display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 16,
            padding: '14px 18px', textDecoration: 'none', color: TOKENS.fg,
            borderTop: i === 0 ? 'none' : `1px dashed ${TOKENS.border}`,
            transition: 'background .2s',
          }} onMouseEnter={e => e.currentTarget.style.background = TOKENS.card2}
             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 11, color: TOKENS.muted, fontVariantNumeric: 'tabular-nums' }}>{p.date}</span>
            <span style={{ fontSize: 13.5 }}>{p.title}</span>
            <span style={{ fontSize: 10, color: TOKENS.subtle, letterSpacing: 1.5, textTransform: 'uppercase' }}>{p.read}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function SidebarA() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  const pad = n => String(n).padStart(2, '0');
  const t = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;
  return (
    <aside style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card, padding: 14 }}>
        <div style={{ fontSize: 10, color: TOKENS.muted, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>// status</div>
        <div style={{ fontSize: 13, color: TOKENS.fg }}>В поиске продуктовых задач</div>
        <div style={{ fontSize: 11, color: TOKENS.muted, marginTop: 4 }}>loc: Лимассол, UTC+3</div>
        <div style={{ marginTop: 10, height: 1, background: TOKENS.border }} />
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <PixelPacman size={2} />
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ width: 3, height: 3, background: TOKENS.primary, opacity: .5 }} />)}
          </div>
        </div>
      </div>

      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card, padding: 14 }}>
        <div style={{ fontSize: 10, color: TOKENS.muted, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>// last seen</div>
        {[
          ['AlpinaGPT пушит кейсы', '2h'],
          ['новый курс по ИИ опубликован', '1d'],
          ['UTMka v2.3.0', '3d'],
          ['лаб: агент на n8n', '5d'],
        ].map(([t, d], i) => (
          <div key={i} style={{ fontSize: 11.5, padding: '6px 0', borderBottom: i < 3 ? `1px dashed ${TOKENS.border}` : 'none',
            display: 'flex', justifyContent: 'space-between', gap: 10, color: TOKENS.fg }}>
            <span style={{ color: TOKENS.subtle }}>{t}</span>
            <span style={{ color: TOKENS.muted, fontVariantNumeric: 'tabular-nums' }}>{d}</span>
          </div>
        ))}
      </div>

      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card, padding: 14 }}>
        <div style={{ fontSize: 10, color: TOKENS.muted, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>// connect</div>
        {[
          ['telegram','t.me/Goryuchnik','→'],
          ['github','@alexmarkets','↗'],
          ['email','напишите','✉'],
        ].map(([k, v, g]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0',
            color: TOKENS.fg }}>
            <span style={{ color: TOKENS.muted }}>{k}</span>
            <span style={{ color: TOKENS.info }}>{v} {g}</span>
          </div>
        ))}
      </div>

      {/* CRT time widget */}
      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: '#060604',
        padding: 12, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.25) 2px, rgba(0,0,0,.25) 3px)',
          pointerEvents: 'none' }} />
        <div style={{ fontSize: 22, fontWeight: 700, color: TOKENS.primary, letterSpacing: 3,
          textShadow: '0 0 8px rgba(255,176,0,.4)', fontVariantNumeric: 'tabular-nums' }}>{t}</div>
        <div style={{ fontSize: 9, color: TOKENS.subtle, letterSpacing: 2, marginTop: 2, textTransform: 'uppercase' }}>local ≈ uptime</div>
      </div>
    </aside>
  );
}

function VariantA() {
  return (
    <div className="pr-root" style={{ width: '100%', minHeight: 1520, padding: '20px 24px 40px' }}>
      <div className="pr-noisebg" />
      <div className="pr-gridBg" style={{ position: 'absolute', inset: 0, opacity: .7 }} />

      {/* top nav */}
      <nav style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center',
        padding: '10px 0 18px', borderBottom: `1px solid ${TOKENS.border}`, marginBottom: 22 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TOKENS.primary, letterSpacing: 1 }}>alex-pronin.ru</span>
        <span style={{ marginLeft: 6, fontSize: 10, color: TOKENS.subtle, letterSpacing: 2 }}>v3.5</span>
        <div style={{ flex: 1 }} />
        {['главная','портфолио','о себе','лаб','блог','терминал'].map(l => (
          <a key={l} href="#" className="pr-link" style={{ padding: '4px 12px', fontSize: 12,
            textTransform: 'lowercase' }}>{l}</a>
        ))}
        <div style={{ marginLeft: 12, display: 'flex', gap: 4 }}>
          <button style={{ background: TOKENS.primary, color: TOKENS.bg, border: 'none', padding: '4px 8px',
            fontSize: 11, fontWeight: 700, borderRadius: 2, cursor: 'pointer' }}>RU</button>
          <button style={{ background: 'transparent', color: TOKENS.muted, border: `1px solid ${TOKENS.border}`,
            padding: '4px 8px', fontSize: 11, borderRadius: 2, cursor: 'pointer' }}>EN</button>
        </div>
      </nav>

      {/* split: content + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, position: 'relative', zIndex: 5 }}>
        <div style={{ minWidth: 0 }}>
          <HeroA />
          <Divider label="путь_героя" />
          <TimelineA />
          <Divider label="проекты" />
          <ProjectsA />
          <Divider label="блог" />
          <BlogA />
        </div>
        <SidebarA />
      </div>

      {/* footer marquee */}
      <div style={{ marginTop: 40, position: 'relative', zIndex: 5, overflow: 'hidden',
        border: `1px solid ${TOKENS.border}`, borderRadius: 4, padding: '8px 0', background: TOKENS.card }}>
        <div className="pr-marquee" style={{ fontSize: 11, color: TOKENS.primaryDim, letterSpacing: 2, textTransform: 'uppercase' }}>
          {Array.from({ length: 2 }).map((_, k) => (
            <React.Fragment key={k}>
              <span>✦ Product Marketing</span><span>◆ No-code Automation</span><span>● AI Integrations</span>
              <span>✦ AlpinaGPT</span><span>◆ Курс по ИИ 2026</span><span>● Next.js · TypeScript</span>
              <span>✦ n8n · Make</span><span>◆ Open-source UTMka</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <CRTOverlay sweep />
    </div>
  );
}

Object.assign(window, { VariantA, TiltCard });
