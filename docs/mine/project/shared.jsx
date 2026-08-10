// shared.jsx — общие примитивы и токены для обоих вариантов и страницы курса
// Amber CRT design system in pure CSS + React

const TOKENS = {
  bg:        '#0a0a08',
  card:      '#12120e',
  card2:     '#1a1a14',
  border:    '#2a2a24',
  border2:   '#3a3a2e',
  fg:        '#d4d0c8',
  muted:     '#8B7534',
  subtle:    '#6B6B5E',
  primary:   '#FFB000',
  primaryDim:'#E08000',
  info:      '#5BE3D4',   // phosphor cyan — second accent for A
  magenta:   '#E05080',   // used only in B
  success:   '#40A040',
  destructive:'#E05040',
  mono: "'Cascadia Code','Cascadia Mono',Consolas,'IBM Plex Mono',ui-monospace,monospace",
};

// inject global stylesheet once per document
if (typeof document !== 'undefined' && !document.getElementById('pronin-styles')) {
  const s = document.createElement('style');
  s.id = 'pronin-styles';
  s.textContent = `
    .pr-root{background:${TOKENS.bg};color:${TOKENS.fg};font-family:${TOKENS.mono};
      font-feature-settings:"ss01","ss02","calt";position:relative;overflow:hidden;box-sizing:border-box;}
    .pr-root, .pr-root *{box-sizing:border-box}
    .pr-scan{position:absolute;inset:0;pointer-events:none;z-index:40;
      background:repeating-linear-gradient(0deg,transparent 0,transparent 2px,rgba(0,0,0,.16) 3px,rgba(0,0,0,.16) 4px)}
    .pr-crtvignette{position:absolute;inset:0;pointer-events:none;z-index:41;
      background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.5) 100%)}
    .pr-flicker{animation:pr-flicker 3.2s steps(2,end) infinite}
    @keyframes pr-flicker{0%,96%,100%{opacity:1}97%{opacity:.85}98%{opacity:.95}}
    @keyframes pr-blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes pr-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(1.3)}}
    @keyframes pr-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes pr-scanSweep{0%{transform:translateY(-30%)}100%{transform:translateY(3000%)}}
    @keyframes pr-ghost{0%,100%{transform:translate(0,0)}25%{transform:translate(-1px,1px)}50%{transform:translate(1px,-1px)}75%{transform:translate(-1px,-1px)}}
    @keyframes pr-glitchX{0%,90%,100%{transform:translateX(0);filter:none}92%{transform:translateX(-2px);filter:hue-rotate(10deg)}94%{transform:translateX(2px)}}
    @keyframes pr-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes pr-rotateSlow{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    @keyframes pr-bootType{from{width:0}to{width:100%}}
    @keyframes pr-caret{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes pr-dotEat{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes pr-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @keyframes pr-chomp{0%,100%{clip-path:polygon(100% 50%,75% 15%,0 0,0 100%,75% 85%)}50%{clip-path:polygon(100% 50%,100% 0,0 0,0 100%,100% 100%)}}
    @keyframes pr-ledPulse{0%,100%{box-shadow:0 0 6px #40A040,0 0 2px #40A040}50%{box-shadow:0 0 2px #40A040}}
    @keyframes pr-noise{0%{transform:translate(0,0)}10%{transform:translate(-1%,1%)}20%{transform:translate(1%,-1%)}30%{transform:translate(-1%,-1%)}40%{transform:translate(1%,1%)}50%{transform:translate(0,0)}60%{transform:translate(-1%,0)}70%{transform:translate(1%,0)}80%{transform:translate(0,1%)}90%{transform:translate(0,-1%)}100%{transform:translate(0,0)}}
    @keyframes pr-breath{0%,100%{opacity:.75}50%{opacity:1}}
    @keyframes pr-riseIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pr-scanline{0%{top:-20%}100%{top:120%}}
    .pr-link{color:${TOKENS.info};text-decoration:none;transition:color .15s}
    .pr-link:hover{color:${TOKENS.primary}}
    .pr-prompt::before{content:'❯ ';color:${TOKENS.primary}}
    .pr-tag{display:inline-block;border:1px solid ${TOKENS.border};border-radius:2px;
      padding:2px 8px;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${TOKENS.muted}}
    .pr-tag--hi{border-color:${TOKENS.primaryDim};color:${TOKENS.primary}}
    .pr-tag--info{border-color:${TOKENS.info};color:${TOKENS.info}}
    .pr-tag--mag{border-color:${TOKENS.magenta};color:${TOKENS.magenta}}
    .pr-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid ${TOKENS.border};
      background:${TOKENS.card};color:${TOKENS.fg};font-family:${TOKENS.mono};font-size:13px;text-decoration:none;
      transition:all .2s ease;position:relative;overflow:hidden}
    .pr-chip:hover{border-color:${TOKENS.primary};color:${TOKENS.primary};transform:translateY(-1px)}
    .pr-chip::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,176,0,.14),transparent);
      transform:translateX(-101%);transition:transform .4s ease}
    .pr-chip:hover::before{transform:translateX(101%)}
    .pr-frame{border:1px solid ${TOKENS.border};border-radius:6px;background:${TOKENS.card};
      position:relative;padding:18px 22px}
    .pr-frame > .pr-frame-legend{position:absolute;top:-10px;left:14px;padding:0 8px;background:${TOKENS.bg};
      font-size:12px;color:${TOKENS.primary};letter-spacing:.5px;display:flex;align-items:center;gap:6px}
    .pr-frame-cornerGlyph{color:${TOKENS.primaryDim};opacity:.5;font-size:11px}
    .pr-frame-corner{position:absolute;width:8px;height:8px;border:1px solid ${TOKENS.primaryDim};opacity:.4}
    .pr-frame-corner.tl{top:-1px;left:-1px;border-right:none;border-bottom:none}
    .pr-frame-corner.tr{top:-1px;right:-1px;border-left:none;border-bottom:none}
    .pr-frame-corner.bl{bottom:-1px;left:-1px;border-right:none;border-top:none}
    .pr-frame-corner.br{bottom:-1px;right:-1px;border-left:none;border-top:none}

    .pr-ledDot{display:inline-block;width:6px;height:6px;border-radius:50%;background:${TOKENS.success};
      box-shadow:0 0 6px ${TOKENS.success};animation:pr-ledPulse 1.8s ease-in-out infinite}

    .pr-cursor{display:inline-block;width:8px;height:14px;background:${TOKENS.primary};
      animation:pr-caret 1s steps(2,end) infinite;vertical-align:text-bottom}

    .pr-noisebg{position:absolute;inset:-20px;pointer-events:none;opacity:.04;
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
      animation:pr-noise 1.2s steps(6,end) infinite}

    .pr-gridBg{background-image:
      linear-gradient(to right,rgba(255,176,0,.03) 1px,transparent 1px),
      linear-gradient(to bottom,rgba(255,176,0,.03) 1px,transparent 1px);
      background-size:28px 28px}

    /* pixel icons */
    .pr-pixelDot{width:6px;height:6px;background:${TOKENS.primary};border-radius:50%;
      box-shadow:0 0 4px rgba(255,176,0,.5)}
    .pr-pixelDot--dim{opacity:.35;box-shadow:none}

    /* 3D cartridge */
    .pr-cart3d{transform-style:preserve-3d;transform:perspective(800px) rotateX(8deg) rotateY(-4deg);
      transition:transform .35s cubic-bezier(.2,.8,.3,1)}
    .pr-cart3d:hover{transform:perspective(800px) rotateX(0deg) rotateY(0deg) translateY(-6px)}

    /* scanline sweep overlay (rare) */
    .pr-scanSweep{position:absolute;left:0;right:0;height:3%;z-index:45;pointer-events:none;
      background:linear-gradient(180deg,transparent,rgba(255,176,0,.18),transparent);
      animation:pr-scanSweep 5.2s linear infinite}

    /* ghost sprite */
    .pr-ghost{animation:pr-ghost 1.6s steps(8,end) infinite}

    /* marquee bar */
    .pr-marquee{display:flex;white-space:nowrap;animation:pr-marquee 38s linear infinite;gap:32px}

    /* divider */
    .pr-divider{height:1px;background:linear-gradient(90deg,transparent,${TOKENS.border} 20%,${TOKENS.border} 80%,transparent);
      margin:28px 0;position:relative}
    .pr-divider::before,.pr-divider::after{content:'◊';position:absolute;top:50%;transform:translateY(-50%);
      color:${TOKENS.primaryDim};background:${TOKENS.bg};padding:0 8px;font-size:10px}
    .pr-divider::before{left:calc(50% - 14px)}
    .pr-divider::after{left:calc(50% + 6px);color:${TOKENS.border2}}

    /* tilt card */
    .pr-tiltCard{transition:transform .3s cubic-bezier(.2,.8,.3,1),border-color .3s,box-shadow .3s;
      transform-style:preserve-3d;will-change:transform}
    .pr-tiltCard:hover{border-color:${TOKENS.primary} !important;
      box-shadow:0 12px 30px rgba(0,0,0,.6),0 0 0 1px rgba(255,176,0,.18)}
  `;
  document.head.appendChild(s);
}

// ——— small hooks & components ———

function useTypewriter(text, speed = 40, startDelay = 0) {
  const [out, setOut] = React.useState('');
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    let i = 0;
    setOut(''); setDone(false);
    const start = setTimeout(() => {
      const t = setInterval(() => {
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length) { clearInterval(t); setDone(true); }
      }, speed);
    }, startDelay);
    return () => clearTimeout(start);
  }, [text, speed, startDelay]);
  return { text: out, done };
}

function TW({ text, speed = 40, delay = 0, cursor = true, className, style }) {
  const { text: t, done } = useTypewriter(text, speed, delay);
  return (
    <span className={className} style={style}>
      {t}{cursor && !done && <span className="pr-cursor" style={{ height: 10, width: 6 }} />}
    </span>
  );
}

// Frame (Claude-style fieldset)
function Frame({ legend, glyph = '✦', children, style, bodyStyle, corners }) {
  return (
    <div className="pr-frame" style={style}>
      {legend && (
        <div className="pr-frame-legend">
          {glyph && <span className="pr-frame-cornerGlyph">{glyph}</span>}
          {legend}
        </div>
      )}
      {corners && (<><i className="pr-frame-corner tl"/><i className="pr-frame-corner tr"/><i className="pr-frame-corner bl"/><i className="pr-frame-corner br"/></>)}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}

// Chip
function Chip({ href = '#', children, onClick }) {
  return <a className="pr-chip" href={href} onClick={onClick}>{children}</a>;
}

// pixelated pacman sprite used on both variants
const PAC_OPEN_GRID = [
  [0,0,0,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,0,0,0,0],
  [0,1,1,1,1,2,0,0,0,0,0],
  [1,1,1,1,1,0,0,0,0,0,0],
  [1,1,1,1,0,0,0,0,0,0,0],
  [1,1,1,0,0,0,0,0,0,0,0],
  [1,1,1,1,0,0,0,0,0,0,0],
  [1,1,1,1,1,0,0,0,0,0,0],
  [0,1,1,1,1,1,0,0,0,0,0],
  [0,0,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,1,0,0,0],
];
const PAC_CLOSED_GRID = [
  [0,0,0,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,2,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,0,0,0],
];

function PixelPacman({ size = 3, flip = false }) {
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => { const id = setInterval(() => setOpen(v => !v), 150); return () => clearInterval(id); }, []);
  const g = open ? PAC_OPEN_GRID : PAC_CLOSED_GRID;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(11,${size}px)`, gridTemplateRows: `repeat(11,${size}px)`,
      transform: flip ? 'scaleX(-1)' : undefined }}>
      {g.flat().map((px, i) => (
        <div key={i} style={{
          background: px === 2 ? TOKENS.bg : px === 1 ? TOKENS.primary : 'transparent',
          boxShadow: px === 1 ? '0 0 3px rgba(255,176,0,.7)' : undefined,
        }} />
      ))}
    </div>
  );
}

// Ghost sprite (used in variant B)
const GHOST_GRID = [
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [1,1,2,2,1,1,1,2,2,1,1],
  [1,1,2,3,1,1,1,2,3,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,1,0,1,0,1,0,0,1],
  [0,0,0,0,0,0,0,0,0,0,0],
];
function PixelGhost({ size = 3, color = TOKENS.magenta }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(11,${size}px)`, gridTemplateRows: `repeat(11,${size}px)` }}
      className="pr-ghost">
      {GHOST_GRID.flat().map((px, i) => (
        <div key={i} style={{
          background: px === 0 ? 'transparent' : px === 2 ? '#fff' : px === 3 ? '#1a4bd6' : color,
        }} />
      ))}
    </div>
  );
}

// ASCII morph letter — one letter that oscillates between its pixel form and an ASCII glyph cloud
function AsciiPixelLetter({ grid, lit = true, morph = 0, scale = 6, color = TOKENS.primary }) {
  // morph 0 = full block, 1 = thinner characters '·', gradually swap shapes
  return (
    <div style={{ display: 'grid',
      gridTemplateColumns: `repeat(5,${scale}px)`,
      gridTemplateRows: `repeat(5,${scale * 1.6}px)`, gap: 1 }}>
      {grid.flat().map((px, i) => {
        if (!px) return <div key={i} />;
        const col = lit ? color : TOKENS.border;
        const showChar = morph > 0.4;
        return (
          <div key={i} style={{
            background: showChar ? 'transparent' : col,
            color: col,
            fontSize: scale * 1.2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: TOKENS.mono,
            transition: 'background .25s ease, color .25s ease',
          }}>
            {showChar ? (morph > 0.75 ? '█' : '▓') : ''}
          </div>
        );
      })}
    </div>
  );
}

// Retro divider
function Divider({ label }) {
  return (
    <div style={{ position: 'relative', margin: '24px 0', display: 'flex', alignItems: 'center', gap: 8, color: TOKENS.subtle, fontSize: 11 }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${TOKENS.border}, transparent)` }} />
      {label && <span style={{ letterSpacing: 2, textTransform: 'uppercase' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${TOKENS.border}, transparent)` }} />
    </div>
  );
}

// Scanline sweep
function CRTOverlay({ sweep = true }) {
  return (
    <>
      <div className="pr-scan" />
      <div className="pr-crtvignette" />
      {sweep && <div className="pr-scanSweep" />}
    </>
  );
}

Object.assign(window, {
  TOKENS, useTypewriter, TW, Frame, Chip,
  PixelPacman, PixelGhost, AsciiPixelLetter, Divider, CRTOverlay,
  PAC_OPEN_GRID, PAC_CLOSED_GRID,
});
