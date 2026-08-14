// variantB.jsx — Home "Arcade Cabinet" — aгрессивнее, больше движения, phosphor-green + magenta.
// Фишки: isometric 3D-стойка картриджей, ghost-преследование pac-man, glitchy имя, 2 экранных режима.

const NAME_LETTERS_B = [
  [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
  [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  [[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  [[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1]],
  [[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
];

function GlitchText({ children, color = '#FFB000' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', color, animation: 'pr-glitchX 4s infinite steps(1,end)' }}>
      <span style={{ position: 'absolute', left: 0, top: 0, color: '#5BE3D4', mixBlendMode: 'screen', opacity: .6, transform: 'translate(1px, 0)' }}>{children}</span>
      <span style={{ position: 'absolute', left: 0, top: 0, color: '#E05080', mixBlendMode: 'screen', opacity: .6, transform: 'translate(-1px, 0)' }}>{children}</span>
      <span style={{ position: 'relative' }}>{children}</span>
    </span>
  );
}

// Isometric 3D cartridge rack
function IsoCartRack({ items, active, onPick }) {
  return (
    <div style={{
      position: 'relative', perspective: 1400, height: 280, padding: '20px 0',
      background: 'radial-gradient(ellipse at center 30%, rgba(91,227,212,.07), transparent 60%)',
      borderRadius: 8,
    }}>
      <div style={{
        position: 'relative', height: '100%', display: 'flex', gap: 14,
        justifyContent: 'center', alignItems: 'flex-end',
        transformStyle: 'preserve-3d',
        transform: 'rotateX(20deg) rotateY(-8deg)',
      }}>
        {items.map((it, i) => {
          const isActive = active === i;
          return (
            <button key={it.y} onClick={() => onPick(i)} style={{
              border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
              width: 70, height: isActive ? 180 : 150, position: 'relative',
              transformStyle: 'preserve-3d',
              transform: `translateZ(${isActive ? 40 : 0}px) translateY(${isActive ? -6 : 0}px) rotateX(${isActive ? -6 : 0}deg)`,
              transition: 'all .45s cubic-bezier(.2,.8,.3,1)',
            }}>
              {/* front */}
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(180deg, ${isActive ? '#2a2820' : '#1e1e18'}, #0e0e0a)`,
                border: `2px solid ${isActive ? TOKENS.primary : TOKENS.border}`,
                borderRadius: '4px 4px 2px 2px',
                boxShadow: isActive ? '0 0 24px rgba(255,176,0,.3)' : '0 4px 12px rgba(0,0,0,.5)',
              }}>
                <div style={{
                  margin: '8px 6px 0', height: 70, borderRadius: 2, background: TOKENS.bg,
                  border: `1px solid ${isActive ? TOKENS.primaryDim : TOKENS.border}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: TOKENS.primary, textShadow: '0 0 6px rgba(255,176,0,.4)' }}>{it.y}</span>
                  <span style={{ fontSize: 6.5, letterSpacing: 1.4, color: TOKENS.muted, textTransform: 'uppercase', marginTop: 2 }}>{it.tag}</span>
                </div>
                {/* grip */}
                <div style={{ padding: '6px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Array.from({ length: 3 }).map((_, j) => <div key={j} style={{ height: 1, background: TOKENS.border }} />)}
                </div>
                <div style={{ position: 'absolute', bottom: 2, left: 10, right: 10,
                  display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {Array.from({ length: 5 }).map((_, j) => <div key={j} style={{ width: 3, height: 4, background: TOKENS.border2 }} />)}
                </div>
              </div>
              {/* side face (right) for depth */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, right: -4, width: 4,
                background: '#0a0a06',
                transform: 'rotateY(90deg) translateZ(2px)', transformOrigin: 'right',
              }} />
              {/* glow when active */}
              {isActive && <div style={{
                position: 'absolute', inset: -4, borderRadius: 6,
                background: 'radial-gradient(ellipse, rgba(255,176,0,.2), transparent 70%)',
                zIndex: -1, filter: 'blur(6px)',
              }} />}
            </button>
          );
        })}
      </div>
      {/* floor reflection */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40,
        background: 'linear-gradient(to top, rgba(255,176,0,.08), transparent)',
        transform: 'perspective(400px) rotateX(60deg)', transformOrigin: 'bottom' }} />
    </div>
  );
}

function HeroB() {
  const [phase, setPhase] = React.useState(0);
  React.useEffect(() => { const id = setInterval(() => setPhase(p => (p + 1) % 3), 3600); return () => clearInterval(id); }, []);
  const subs = [
    'PMM · AUTOMATION · AI',
    'n8n · LLM · Next.js',
    'курс по ИИ · alpinaGPT · lab',
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* arcade marquee-title */}
      <div style={{ position: 'relative', padding: '24px 20px',
        border: `2px solid ${TOKENS.primary}`, borderRadius: 6,
        background: `linear-gradient(180deg, rgba(255,176,0,.06), transparent 60%), ${TOKENS.card}`,
        boxShadow: 'inset 0 0 30px rgba(255,176,0,.06)',
      }}>
        {/* corner bolts */}
        {[['tl',6,6],['tr',6,'auto'],['bl','auto',6],['br','auto','auto']].map(([k, t, l]) => (
          <div key={k} style={{
            position: 'absolute',
            top: k[0] === 't' ? t : 'auto', bottom: k[0] === 'b' ? 6 : 'auto',
            left: k[1] === 'l' ? l : 'auto', right: k[1] === 'r' ? 6 : 'auto',
            width: 6, height: 6, background: TOKENS.primaryDim, borderRadius: '50%',
            boxShadow: 'inset 0 0 2px #000',
          }} />
        ))}

        {/* STATUS + INSERT COIN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: TOKENS.magenta, letterSpacing: 2, textTransform: 'uppercase',
            animation: 'pr-blink 1.3s step-end infinite' }}>▶ INSERT COIN</span>
          <span style={{ fontSize: 11, color: TOKENS.success, letterSpacing: 2, textTransform: 'uppercase' }}>
            1UP · 184 200
          </span>
          <span style={{ fontSize: 11, color: TOKENS.info, letterSpacing: 2, textTransform: 'uppercase', marginLeft: 'auto' }}>
            HI-SCORE · 999 999
          </span>
        </div>

        {/* ASCII name, bigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px,2vw,20px)',
          padding: '8px 0 2px', justifyContent: 'center' }}>
          {NAME_LETTERS_B.map((grid, i) => (
            <AsciiPixelLetter key={i} grid={grid} lit scale={17} color={i % 2 ? TOKENS.primary : TOKENS.primaryDim} />
          ))}
        </div>

        {/* pacman chase line */}
        <div style={{ position: 'relative', height: 26, marginTop: 14, overflow: 'hidden',
          borderTop: `1px solid ${TOKENS.border}`, borderBottom: `1px solid ${TOKENS.border}` }}>
          {/* dots */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 6px', gap: 14 }}>
            {Array.from({ length: 32 }).map((_, i) => (
              <span key={i} style={{ width: 4, height: 4, background: TOKENS.muted, borderRadius: '50%',
                animation: `pr-dotEat 3.6s linear ${i * 0.1}s infinite` }} />
            ))}
          </div>
          {/* pacman */}
          <div style={{ position: 'absolute', top: 4, left: 0, animation: 'pr-marquee 3.6s linear infinite' }}>
            <PixelPacman size={2.2} />
          </div>
          {/* ghosts chase */}
          {[TOKENS.magenta, TOKENS.info, TOKENS.success].map((c, i) => (
            <div key={i} style={{
              position: 'absolute', top: 4, left: 0,
              animation: `pr-marquee 3.6s linear ${0.3 + i * 0.2}s infinite`,
              transform: `translateX(${-(i + 1) * 40}px)`,
            }}>
              <PixelGhost size={2.2} color={c} />
            </div>
          ))}
        </div>

        {/* subtitle */}
        <div style={{ minHeight: 26, fontSize: 15, color: TOKENS.fg, letterSpacing: 1,
          textAlign: 'center', marginTop: 14 }} key={phase}>
          <span style={{ animation: 'pr-riseIn .45s ease-out', display: 'inline-block' }}>
            <GlitchText>{subs[phase]}</GlitchText>
          </span>
        </div>

        {/* chips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          {['PLAY → /портфолио','CONTINUE → /о_себе','LAB → /эксперименты','READ → /блог','COURSE → /ии'].map(label => (
            <Chip key={label}>{label}</Chip>
          ))}
        </div>
      </div>

      {/* quick cmd row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
        {[
          ['❯ whoami','Александр Пронин, PMM/AI'],
          ['❯ ls stack','n8n · next · claude · gpt'],
          ['❯ availability','open для продуктовых задач'],
        ].map(([cmd, val]) => (
          <div key={cmd} style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 4, padding: '10px 12px',
            background: TOKENS.card }}>
            <div style={{ fontSize: 10.5, color: TOKENS.primary, letterSpacing: 1 }}>{cmd}</div>
            <div style={{ fontSize: 12, color: TOKENS.fg, marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineB() {
  const [active, setActive] = React.useState(4);
  const YEARS = [
    { y: '2012', tag: 'маркет', lv: 1, title: 'Маркетолог · start', text: 'Первые рекламные кампании, контекст, SMM.' },
    { y: '2015', tag: 'digital', lv: 2, title: 'Digital', text: 'Таргет, SEO, воронки, A/B.' },
    { y: '2018', tag: 'growth', lv: 3, title: 'Growth', text: 'CJM, unit-экономика, SaaS-метрики.' },
    { y: '2020', tag: 'pmm', lv: 4, title: 'PMM', text: 'B2B SaaS запуски, позиционирование.' },
    { y: '2022', tag: 'auto', lv: 5, title: 'n8n/no-code', text: 'Автоматизация процессов и воронок.' },
    { y: '2023', tag: 'ai', lv: 6, title: 'ИИ + code', text: 'Вайб-кодинг, LLM-продукты на Next.js.' },
    { y: '2025', tag: 'now', lv: 7, title: 'Now playing', text: 'AlpinaGPT, курс по ИИ, лаборатория.' },
  ];
  const c = YEARS[active];

  return (
    <div style={{ marginTop: 42 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 14 }}>
        <span className="pr-prompt">game /история --mode=arcade</span>
      </div>
      <IsoCartRack items={YEARS} active={active} onPick={setActive} />
      {/* screen */}
      <div style={{ marginTop: 10, padding: '18px 22px', border: `2px solid ${TOKENS.primary}`, borderRadius: 6,
        background: `linear-gradient(180deg, rgba(64,160,64,.04), #060604)`,
        position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.22) 2px, rgba(0,0,0,.22) 4px)',
          pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontSize: 10, color: TOKENS.primaryDim, letterSpacing: 2, textTransform: 'uppercase' }}>
            STAGE {c.lv} · {c.y}
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: TOKENS.primary }}>{c.title}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: TOKENS.success, letterSpacing: 2 }}>CLEARED ✓</span>
        </div>
        <p style={{ fontSize: 13.5, color: TOKENS.fg, opacity: .9, lineHeight: 1.55, margin: '10px 0 0', maxWidth: 600 }}>{c.text}</p>
        {/* power meter */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 1 }}>PWR</span>
          <div style={{ flex: 1, height: 8, background: '#0a0a06', borderRadius: 1, overflow: 'hidden',
            border: `1px solid ${TOKENS.border}` }}>
            <div style={{ width: `${(c.lv / 7) * 100}%`, height: '100%',
              background: `linear-gradient(90deg, ${TOKENS.primaryDim}, ${TOKENS.primary}, ${TOKENS.success})` }} />
          </div>
          <span style={{ fontSize: 10, color: TOKENS.primary, fontVariantNumeric: 'tabular-nums' }}>{c.lv}/7</span>
        </div>
      </div>
    </div>
  );
}

function ProjectsB() {
  const items = [
    { badge: 'PROD', color: TOKENS.primary, title: 'AI-ассистент школы', desc: 'LLM-чатбот для 20+ франчайзи.', score: '4200' },
    { badge: 'CASE', color: TOKENS.info,    title: 'AlpinaGPT',          desc: 'GTM для B2B-подписки.',             score: '3800' },
    { badge: 'OPEN', color: TOKENS.success, title: 'UTMka Service',      desc: 'Open-source UTM-менеджер.',          score: '2900' },
    { badge: 'LAB',  color: TOKENS.magenta, title: 'CSV neural',         desc: 'Desktop-приложение для анализа CSV.', score: '1700' },
  ];
  return (
    <div style={{ marginTop: 42 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 14 }}>
        <span className="pr-prompt">select project --order=score</span>
      </div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        {items.map(p => (
          <TiltCard key={p.title} intensity={10} style={{
            border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card,
            padding: '14px 18px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, bottom: 0, background: p.color }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ padding: '2px 8px', border: `1px solid ${p.color}`, color: p.color,
                fontSize: 10, letterSpacing: 1.5 }}>{p.badge}</span>
              <h3 style={{ margin: 0, fontSize: 14.5, color: TOKENS.fg, fontWeight: 600 }}>{p.title}</h3>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: TOKENS.muted, letterSpacing: 1 }}>SCORE {p.score}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.muted, lineHeight: 1.55 }}>{p.desc}</p>
          </TiltCard>
        ))}
      </div>
    </div>
  );
}

function SidebarB() {
  return (
    <aside style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ border: `2px solid ${TOKENS.primary}`, borderRadius: 6, background: TOKENS.card, padding: 14,
        boxShadow: '0 0 0 1px rgba(255,176,0,.15)' }}>
        <div style={{ fontSize: 10, color: TOKENS.magenta, marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>▶ PLAYER 1</div>
        <div style={{ fontSize: 14, color: TOKENS.primary, fontWeight: 700 }}>АЛЕКСАНДР ПРОНИН</div>
        <div style={{ fontSize: 11, color: TOKENS.muted, marginTop: 4 }}>ROLE: PMM · AI INTEGRATOR</div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['HP','87/100', TOKENS.success],['MP','62/100', TOKENS.info],['XP','LV·14', TOKENS.primary],['LCK','★★★★☆', TOKENS.magenta]].map(([k, v, col]) => (
            <div key={k} style={{ fontSize: 10.5, color: TOKENS.fg }}>
              <span style={{ color: col, letterSpacing: 1 }}>{k}</span> <span style={{ color: TOKENS.subtle }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card, padding: 14 }}>
        <div style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>▦ INVENTORY</div>
        {[
          ['n8n', 'AUTOMATION', TOKENS.primary],
          ['claude', 'LLM', TOKENS.info],
          ['next.js', 'FRAMEWORK', TOKENS.success],
          ['sanity', 'CMS', TOKENS.magenta],
          ['figma', 'DESIGN', TOKENS.primaryDim],
        ].map(([n, t, c]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
            borderBottom: `1px dashed ${TOKENS.border}`, fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, background: c, borderRadius: 1 }} />
            <span style={{ color: TOKENS.fg, flex: 1 }}>{n}</span>
            <span style={{ color: TOKENS.subtle, fontSize: 9, letterSpacing: 1 }}>{t}</span>
          </div>
        ))}
      </div>

      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: '#060604', padding: 14,
        position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.25) 2px, rgba(0,0,0,.25) 3px)' }} />
        <div style={{ fontSize: 10, color: TOKENS.success, letterSpacing: 2, textTransform: 'uppercase', position: 'relative' }}>▶ CONTACT</div>
        <div style={{ marginTop: 10, position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[['TG', '@Goryuchnik'],['GH','@alexmarkets'],['MAIL','hey@alex-pronin.ru']].map(([k, v]) => (
            <a key={k} className="pr-link" href="#" style={{ display: 'flex', fontSize: 12, justifyContent: 'space-between' }}>
              <span style={{ color: TOKENS.muted }}>{k}</span><span>{v}</span>
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}

function VariantB() {
  return (
    <div className="pr-root" style={{ width: '100%', minHeight: 1520, padding: '20px 24px 40px' }}>
      <div className="pr-gridBg" style={{ position: 'absolute', inset: 0, opacity: .7 }} />
      {/* star field */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`,
            width: 2, height: 2, background: i % 4 === 0 ? TOKENS.info : TOKENS.primary,
            opacity: .4, animation: `pr-breath ${2 + (i % 5) * 0.4}s ease-in-out ${i * 0.1}s infinite`,
          }} />
        ))}
      </div>

      <nav style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center',
        padding: '10px 16px', border: `2px solid ${TOKENS.primary}`, borderRadius: 6,
        background: TOKENS.card, marginBottom: 22 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TOKENS.primary, letterSpacing: 1 }}>
          <GlitchText>PRONIN.ARCADE</GlitchText>
        </span>
        <div style={{ flex: 1 }} />
        {['home','port','about','lab','blog','course'].map(l => (
          <a key={l} href="#" className="pr-link" style={{ padding: '4px 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>{l}</a>
        ))}
        <span style={{ marginLeft: 16, fontSize: 10, color: TOKENS.magenta, letterSpacing: 2, animation: 'pr-blink 1.4s step-end infinite' }}>REC ●</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, position: 'relative', zIndex: 5 }}>
        <div style={{ minWidth: 0 }}>
          <HeroB />
          <Divider label="stages" />
          <TimelineB />
          <Divider label="high-scores" />
          <ProjectsB />
        </div>
        <SidebarB />
      </div>

      <CRTOverlay sweep />
    </div>
  );
}

Object.assign(window, { VariantB });
