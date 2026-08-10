// lesson01.jsx — Урок 0.1 «Что вообще происходит»
// Самостоятельный файл: внутри IIFE, не пересекается с другими вариантами.
(function(){

// ---------- THEME HOOK ----------
function useCourseTheme() {
  const [dark, setDark] = React.useState(false);
  return { dark, setDark, T: dark ? D_DARK : D_LIGHT };
}

// Две палитры для курса. База — amber, но в светлой теме «бумага».
const D_LIGHT = {
  bg:        '#F6F1E4',        // крафтовая бумага
  paper:     '#FFFDF7',
  cardA:     '#FFFFFF',
  cardB:     '#FBF3DE',
  ink:       '#1A1814',
  ink2:      '#3A3530',
  muted:     '#7A6F5C',
  subtle:    '#A89F8A',
  line:      '#E4DBC2',
  line2:     '#CFC2A0',
  // акценты — остаются от ретро-мира, но приглушённые
  amber:     '#E08000',
  amberSoft: '#FFE3A8',
  teal:      '#2A8F85',
  tealSoft:  '#CFEEEA',
  magenta:   '#B33A6A',
  red:       '#C64545',
  green:     '#3F8F3F',
  blue:      '#3560B3',
  // спец для чата
  userBubble:'#FFE3A8',
  botBubble: '#FFFFFF',
  codeBg:    '#231F1A',
  codeFg:    '#FFB000',
  accent:    '#E08000',
  mono: "'Cascadia Code','Cascadia Mono',Consolas,'IBM Plex Mono',ui-monospace,monospace",
  display: "'Cascadia Code','Cascadia Mono',Consolas,monospace",
  body: "'Inter','Helvetica Neue',system-ui,-apple-system,sans-serif",
};
const D_DARK = {
  bg: '#0a0a08', paper: '#14140f', cardA: '#1c1c15', cardB: '#222019',
  ink: '#ECE5D0', ink2: '#CFC6AC', muted: '#8B7534', subtle: '#6B6B5E',
  line: '#2a2a24', line2: '#3a3a2e',
  amber: '#FFB000', amberSoft: '#3A2A0A',
  teal: '#5BE3D4', tealSoft: '#143F3B',
  magenta: '#E05080', red: '#E05040', green: '#5FCF5F', blue: '#8FB8FF',
  userBubble: '#3A2A0A', botBubble: '#1c1c15',
  codeBg: '#05050a', codeFg: '#FFB000',
  accent: '#FFB000',
  mono: "'Cascadia Code','Cascadia Mono',Consolas,monospace",
  display: "'Cascadia Code','Cascadia Mono',Consolas,monospace",
  body: "'Inter',system-ui,sans-serif",
};

// ---------- PIXEL SVG ICONS (эмодзи-стиль, многоцветные) ----------
// Грид — массив чисел, где:
// 0 — прозрачно, 1 — primary color, либо ключ из палитры pal (2..9)
// Если передан pal — используется он, иначе 1 = color.
function PixelIcon({ grid, size = 2, color = '#E08000', bg = 'transparent', pal }) {
  const n = grid.length;
  const m = grid[0].length;
  const resolve = (v) => {
    if (!v) return null;
    if (pal && pal[v]) return pal[v];
    return color;
  };
  return (
    <svg width={m * size} height={n * size} viewBox={`0 0 ${m} ${n}`} shapeRendering="crispEdges"
      style={{ flexShrink: 0 }}>
      {bg !== 'transparent' && <rect width={m} height={n} fill={bg} />}
      {grid.flatMap((row, y) => row.map((v, x) => {
        const f = resolve(v);
        return f ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={f} /> : null;
      }))}
    </svg>
  );
}

// ⚡ Молния — объёмная, с «тенью»
// 1 = жёлтый; 2 = янтарный тёмный (контур/тень)
const ICON_BOLT = [
  [0,0,0,0,2,2,2,0,0,0],
  [0,0,0,2,1,1,2,0,0,0],
  [0,0,2,1,1,1,2,0,0,0],
  [0,2,1,1,1,2,0,0,0,0],
  [2,1,1,1,2,2,2,2,2,0],
  [2,1,1,2,2,1,1,1,2,0],
  [2,2,2,2,1,1,1,2,0,0],
  [0,0,0,2,1,1,2,0,0,0],
  [0,0,0,2,1,2,0,0,0,0],
  [0,0,0,2,2,0,0,0,0,0],
];
const PAL_BOLT = { 1: '#FFD24A', 2: '#C67A1A' };

// 🧠 Мозг — две полусферы, извилина, контур
// 1 = розовый мозг, 2 = тёмный контур, 3 = тёмно-розовая извилина
const ICON_BRAIN = [
  [0,0,2,2,2,2,2,2,2,2,0,0],
  [0,2,1,1,1,1,2,1,1,1,2,0],
  [2,1,1,3,1,1,2,1,3,1,1,2],
  [2,1,3,1,1,2,2,2,1,1,3,2],
  [2,1,1,1,2,1,1,1,2,1,1,2],
  [2,1,3,2,1,1,3,1,1,2,1,2],
  [2,1,1,1,1,2,1,1,1,1,1,2],
  [2,1,3,1,2,1,1,2,1,3,1,2],
  [0,2,1,1,1,1,1,1,1,1,2,0],
  [0,0,2,2,2,2,2,2,2,2,0,0],
];
const PAL_BRAIN = { 1: '#F8AAB5', 2: '#8C2A4E', 3: '#D06A85' };

// 🎯 Мишень — 3 кольца с центром
// 1 = красный, 2 = белый, 3 = тёмный контур, 4 = жёлтое яблочко
const ICON_TARGET = [
  [0,0,3,3,3,3,3,3,0,0],
  [0,3,1,1,1,1,1,1,3,0],
  [3,1,2,2,2,2,2,2,1,3],
  [3,1,2,1,1,1,1,2,1,3],
  [3,1,2,1,4,4,1,2,1,3],
  [3,1,2,1,4,4,1,2,1,3],
  [3,1,2,1,1,1,1,2,1,3],
  [3,1,2,2,2,2,2,2,1,3],
  [0,3,1,1,1,1,1,1,3,0],
  [0,0,3,3,3,3,3,3,0,0],
];
const PAL_TARGET = { 1: '#C64545', 2: '#FFFDF7', 3: '#2A1414', 4: '#FFD24A' };

// 📖 Книга — открытая, с корешком и страницами
// 1 = обложка (янтарь), 2 = контур, 3 = белые страницы, 4 = линии текста
const ICON_BOOK = [
  [0,2,2,2,2,2,0,2,2,2,2,2,0],
  [2,1,1,1,1,1,2,1,1,1,1,1,2],
  [2,1,3,3,3,3,2,3,3,3,3,1,2],
  [2,1,3,4,4,3,2,3,4,4,3,1,2],
  [2,1,3,3,3,3,2,3,3,3,3,1,2],
  [2,1,3,4,4,3,2,3,4,4,3,1,2],
  [2,1,3,3,3,3,2,3,3,3,3,1,2],
  [2,1,3,4,4,3,2,3,4,4,3,1,2],
  [2,1,3,3,3,3,2,3,3,3,3,1,2],
  [2,1,1,1,1,1,2,1,1,1,1,1,2],
  [0,2,2,2,2,2,2,2,2,2,2,2,0],
];
const PAL_BOOK = { 1: '#C67A1A', 2: '#2A1408', 3: '#FFFDF7', 4: '#B89068' };

// 🚩 Флаг — на древке, волна
// 1 = красный флаг, 2 = тёмный контур, 3 = древко (коричневый), 4 = светлая полоса
const ICON_FLAG = [
  [3,2,0,0,0,0,0,0,0,0],
  [3,2,2,2,2,2,2,2,0,0],
  [3,2,1,1,1,1,1,2,2,0],
  [3,2,1,4,4,1,1,1,2,0],
  [3,2,1,1,1,1,1,1,2,0],
  [3,2,1,1,4,1,1,2,2,0],
  [3,2,1,1,1,1,2,2,0,0],
  [3,2,2,2,2,2,2,0,0,0],
  [3,3,0,0,0,0,0,0,0,0],
  [3,3,0,0,0,0,0,0,0,0],
];
const PAL_FLAG = { 1: '#C64545', 2: '#2A1408', 3: '#6E4A28', 4: '#F8AAB5' };

// 🔧 Гаечный ключ — диагональный
// 1 = серебро, 2 = тёмный контур, 3 = блик
const ICON_WRENCH = [
  [0,0,0,0,0,0,2,2,2,0],
  [0,0,0,0,0,2,1,1,2,2],
  [0,0,0,0,2,1,3,2,1,2],
  [0,0,0,2,1,1,2,2,1,2],
  [0,0,2,1,1,2,2,1,2,0],
  [0,2,1,1,2,2,1,2,0,0],
  [2,1,3,2,2,1,2,0,0,0],
  [2,1,2,2,1,2,0,0,0,0],
  [2,2,2,1,2,0,0,0,0,0],
  [0,2,2,2,0,0,0,0,0,0],
];
const PAL_WRENCH = { 1: '#B0B0B0', 2: '#2A1408', 3: '#F0F0F0' };

// ➡ Стрелка — толстая, объёмная, с тенью
// 1 = основной цвет, 2 = контур/тень
const ICON_ARROW = [
  [0,0,0,2,0,0,0,0,0,0],
  [0,0,2,1,2,0,0,0,0,0],
  [0,2,1,1,1,2,0,0,0,0],
  [2,1,1,1,1,1,2,2,2,2],
  [2,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,2,2,2,2],
  [0,2,1,1,1,2,0,0,0,0],
  [0,0,2,1,2,0,0,0,0,0],
  [0,0,0,2,0,0,0,0,0,0],
];
const PAL_ARROW_AMBER = { 1: '#FFB000', 2: '#8C5A14' };
const PAL_ARROW_MUTED = { 1: '#A89F8A', 2: '#3A3530' };

// 💡 Лампочка — для зацепа/идеи
const ICON_BULB = [
  [0,0,0,2,2,2,2,0,0,0],
  [0,0,2,1,1,1,1,2,0,0],
  [0,2,1,4,4,4,1,1,2,0],
  [0,2,1,4,1,4,1,1,2,0],
  [0,2,1,1,1,1,1,1,2,0],
  [0,0,2,1,1,1,1,2,0,0],
  [0,0,2,1,1,1,1,2,0,0],
  [0,0,0,3,3,3,3,0,0,0],
  [0,0,0,3,3,3,3,0,0,0],
  [0,0,0,0,3,3,0,0,0,0],
];
const PAL_BULB = { 1: '#FFE04A', 2: '#8C5A14', 3: '#5A5040', 4: '#FFFDF7' };

// ⏱ Часы — круглые, со стрелками
const ICON_CLOCK = [
  [0,0,3,3,3,3,3,3,0,0],
  [0,3,1,1,1,1,1,1,3,0],
  [3,1,2,1,1,2,1,1,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [3,1,1,1,4,4,1,1,1,3],
  [3,1,1,1,4,1,1,2,1,3],
  [3,2,1,1,4,1,1,1,1,3],
  [3,1,1,1,1,1,2,1,1,3],
  [0,3,1,1,2,1,1,1,3,0],
  [0,0,3,3,3,3,3,3,0,0],
];
const PAL_CLOCK = { 1: '#FFFDF7', 2: '#7A6F5C', 3: '#2A1408', 4: '#C64545' };

// 💬 Речевой пузырь — для чата/кейса
const ICON_CHAT = [
  [0,2,2,2,2,2,2,2,2,0],
  [2,1,1,1,1,1,1,1,1,2],
  [2,1,3,1,3,1,3,1,1,2],
  [2,1,1,1,1,1,1,1,1,2],
  [2,1,3,1,1,1,3,1,1,2],
  [2,1,1,1,1,1,1,1,1,2],
  [2,2,2,2,2,2,2,1,1,2],
  [0,0,0,0,0,2,1,1,1,2],
  [0,0,0,0,2,1,1,2,2,0],
  [0,0,0,2,2,2,0,0,0,0],
];
const PAL_CHAT_AMBER = { 1: '#FFE3A8', 2: '#8C5A14', 3: '#E08000' };
const PAL_CHAT_TEAL = { 1: '#CFEEEA', 2: '#1E5F58', 3: '#2A8F85' };

// ✓ Галочка в кружке — для Callout "важно"
const ICON_CHECK = [
  [0,0,2,2,2,2,2,2,0,0],
  [0,2,1,1,1,1,1,1,2,0],
  [2,1,1,1,1,1,3,1,1,2],
  [2,1,1,1,1,3,3,1,1,2],
  [2,1,3,1,3,3,1,1,1,2],
  [2,1,3,3,3,1,1,1,1,2],
  [2,1,1,3,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,2],
  [0,2,1,1,1,1,1,1,2,0],
  [0,0,2,2,2,2,2,2,0,0],
];
const PAL_CHECK_TEAL = { 1: '#CFEEEA', 2: '#1E5F58', 3: '#2A8F85' };

// ❗ Восклицание — для предупреждения
const ICON_WARN = [
  [0,0,0,2,2,2,0,0,0,0],
  [0,0,2,1,1,1,2,0,0,0],
  [0,2,1,1,3,1,1,2,0,0],
  [0,2,1,3,3,3,1,2,0,0],
  [2,1,1,3,3,3,1,1,2,0],
  [2,1,1,3,3,3,1,1,2,0],
  [2,1,1,1,3,1,1,1,2,0],
  [2,1,1,3,3,3,1,1,2,0],
  [0,2,1,1,1,1,1,2,0,0],
  [0,0,2,2,2,2,2,0,0,0],
];
const PAL_WARN = { 1: '#FFE04A', 2: '#8C5A14', 3: '#C64545' };

// ❝ Кавычки — для цитаты
const ICON_QUOTE = [
  [0,2,2,2,0,0,2,2,2,0],
  [2,1,1,1,2,2,1,1,1,2],
  [2,1,3,3,1,1,3,3,1,2],
  [2,1,3,3,1,1,3,3,1,2],
  [2,1,1,3,2,2,1,3,1,2],
  [0,2,2,3,0,0,2,3,2,0],
  [0,0,0,3,0,0,0,3,0,0],
  [0,0,3,3,0,0,3,3,0,0],
  [0,0,3,0,0,0,3,0,0,0],
  [0,0,0,0,0,0,0,0,0,0],
];
const PAL_QUOTE = { 1: '#FADBE5', 2: '#6E1F3A', 3: '#B33A6A' };

// ⚙ Шестерёнка — для "под капотом" / инструментов
const ICON_GEAR = [
  [0,0,0,2,2,0,2,2,0,0],
  [0,0,2,1,1,2,1,1,2,0],
  [2,2,2,1,1,1,1,1,2,2],
  [2,1,1,1,2,2,1,1,1,2],
  [2,1,1,2,3,3,2,1,1,2],
  [2,1,1,2,3,3,2,1,1,2],
  [2,1,1,1,2,2,1,1,1,2],
  [2,2,2,1,1,1,1,1,2,2],
  [0,0,2,1,1,2,1,1,2,0],
  [0,0,0,2,2,0,2,2,0,0],
];
const PAL_GEAR = { 1: '#B0B0B0', 2: '#2A1408', 3: '#FFB000' };

// ---------- unified Icon component ----------
const ICON_REGISTRY = {
  bolt:   { grid: ICON_BOLT,   pal: PAL_BOLT },
  brain:  { grid: ICON_BRAIN,  pal: PAL_BRAIN },
  target: { grid: ICON_TARGET, pal: PAL_TARGET },
  book:   { grid: ICON_BOOK,   pal: PAL_BOOK },
  flag:   { grid: ICON_FLAG,   pal: PAL_FLAG },
  wrench: { grid: ICON_WRENCH, pal: PAL_WRENCH },
  arrow:  { grid: ICON_ARROW,  pal: PAL_ARROW_AMBER },
  bulb:   { grid: ICON_BULB,   pal: PAL_BULB },
  clock:  { grid: ICON_CLOCK,  pal: PAL_CLOCK },
  chat:   { grid: ICON_CHAT,   pal: PAL_CHAT_AMBER },
  check:  { grid: ICON_CHECK,  pal: PAL_CHECK_TEAL },
  warn:   { grid: ICON_WARN,   pal: PAL_WARN },
  quote:  { grid: ICON_QUOTE,  pal: PAL_QUOTE },
  gear:   { grid: ICON_GEAR,   pal: PAL_GEAR },
};
function Icon({ name, size = 2, pal: palOverride, color }) {
  const entry = ICON_REGISTRY[name];
  if (!entry) return null;
  return <PixelIcon grid={entry.grid} size={size} pal={palOverride || entry.pal} color={color} />;
}

// ---------- AVATARS ----------
function CoachAvatar({ size = 40, T }) {
  // Пиксельный автор: очки + характерная стрижка
  const g = [
    [0,0,0,1,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,2,2,2,2,2,2,2,1,0],
    [0,1,2,2,2,2,2,2,2,2,1,1],
    [1,1,2,3,3,2,2,3,3,2,2,1],
    [1,2,2,3,3,2,2,3,3,2,2,1],
    [1,2,2,2,2,4,4,2,2,2,2,1],
    [1,2,2,2,4,4,4,4,2,2,2,1],
    [0,1,2,2,2,4,4,2,2,2,1,0],
    [0,1,2,2,2,5,5,2,2,2,1,0],
    [0,0,1,2,5,5,5,5,2,1,0,0],
    [0,0,0,1,1,1,1,1,1,0,0,0],
  ];
  const pal = { 1: T.ink, 2: '#E8C9A0', 3: '#1A1814', 4: '#C67A4C', 5: '#B23A4A' };
  const px = size / g.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${g.length} ${g.length}`} shapeRendering="crispEdges"
      style={{ flexShrink: 0, borderRadius: 4, background: T.amberSoft }}>
      {g.flatMap((row, y) => row.map((v, x) => v ? (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={pal[v] || T.ink} />
      ) : null))}
    </svg>
  );
}

// Pacman-like user avatar grid (локальный символв IIFE)
const PAC_OPEN_GRID = [
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,0,0,0,0,0,0],
  [1,1,1,1,0,0,0,0,0,0,0],
  [1,1,1,0,0,0,0,0,0,0,0],
  [1,1,1,0,0,0,0,0,0,0,0],
  [1,1,1,0,0,0,0,0,0,0,0],
  [1,1,1,1,0,0,0,0,0,0,0],
  [1,1,1,1,1,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,0,0],
];
const PAC_CLOSED_GRID = [
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,0,0],
];

function UserAvatar({ size = 36, T }) {
  // Пакман
  return (
    <svg width={size} height={size} viewBox="0 0 11 11" shapeRendering="crispEdges"
      style={{ flexShrink: 0, borderRadius: 4, background: T.line }}>
      {PAC_OPEN_GRID.flatMap((row, y) => row.map((v, x) => v ? (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={T.amber} />
      ) : null))}
    </svg>
  );
}

// ---------- SPECIAL TEXT (стиль special-text из 21st.dev) ----------
function SpecialText({ children, T }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block',
      background: `linear-gradient(92deg, ${T.amber} 0%, ${T.magenta} 50%, ${T.teal} 100%)`,
      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      fontWeight: 800, letterSpacing: '-0.02em',
    }}>{children}</span>
  );
}

// ---------- TOP BAR ----------
function CourseTopBar({ dark, setDark, T }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20,
      background: T.paper + 'EE', backdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${T.line}`, padding: '12px 22px',
      display: 'flex', alignItems: 'center', gap: 14, fontFamily: T.body }}>
      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
        color: T.ink, fontFamily: T.mono, fontSize: 13, fontWeight: 600 }}>
        <span style={{ color: T.amber }}>❯</span> курс.ии
      </a>
      <span style={{ color: T.line2, fontSize: 12 }}>/</span>
      <nav style={{ display: 'flex', gap: 2, fontSize: 13 }}>
        {[
          { t: 'к курсам', href: '#' },
          { t: 'к модулям', href: '#' },
          { t: 'выйти', href: '#' },
        ].map(l => (
          <a key={l.t} href={l.href} style={{ padding: '6px 12px', color: T.muted, textDecoration: 'none',
            borderRadius: 4, transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = T.ink; e.currentTarget.style.background = T.line; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = 'transparent'; }}>{l.t}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      {/* language */}
      <button style={{ padding: '5px 10px', background: 'transparent', border: `1px solid ${T.line}`,
        borderRadius: 4, color: T.muted, fontFamily: T.mono, fontSize: 11, letterSpacing: 1.5,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        RU <span style={{ opacity: .4 }}>/ EN</span>
      </button>
      {/* theme toggle — shadcn/21st.dev style */}
      <button onClick={() => setDark(!dark)} style={{
        width: 46, height: 24, borderRadius: 999, border: `1px solid ${T.line2}`,
        background: dark ? T.cardA : T.amberSoft, position: 'relative', cursor: 'pointer',
        padding: 0, transition: 'all .25s' }}>
        <span style={{
          position: 'absolute', top: 1, left: dark ? 22 : 1, width: 20, height: 20, borderRadius: '50%',
          background: dark ? T.amber : T.paper, transition: 'all .25s cubic-bezier(.4,.8,.2,1.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: dark ? T.bg : T.amber,
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }}>{dark ? '☾' : '☀'}</span>
      </button>
    </header>
  );
}

// ---------- SIDEBAR: course menu (desktop > 1280) ----------
const COURSE_TOC = [
  { n: '0', title: 'Вводная', current: true, lessons: [
    { n: '0.1', t: 'Что вообще происходит', current: true },
    { n: '0.2', t: 'Почему нельзя не разобраться' },
  ]},
  { n: '1', title: 'Язык ИИ', lessons: [
    { n: '1.1', t: 'Как ИИ думает' },
    { n: '1.2', t: 'Анатомия промпта' },
    { n: '1.3', t: 'Продвинутые техники' },
    { n: '1.4', t: 'Галлюцинации' },
  ]},
  { n: '2', title: 'Поиск и разбор', lessons: [
    { n: '2.1', t: 'Perplexity' },
    { n: '2.2', t: 'NotebookLM' },
    { n: '2.3', t: 'Research pipeline' },
  ]},
  { n: '3', title: 'Создание', lessons: [
    { n: '3.1', t: 'Текст' },
    { n: '3.2', t: 'Картинки' },
    { n: '3.3', t: 'Звук' },
    { n: '3.4', t: 'Видео' },
  ]},
  { n: '4', title: 'Свой помощник', lessons: [
    { n: '4.1', t: 'Custom GPTs' },
    { n: '4.2', t: 'Агенты' },
    { n: '4.3', t: 'Cursor / Claude Code' },
    { n: '4.4', t: 'Что дальше' },
  ]},
];

function CourseSidebar({ T }) {
  return (
    <aside style={{ width: 280, flexShrink: 0, padding: '24px 18px 24px 22px',
      borderRight: `1px solid ${T.line}`, fontFamily: T.body,
      position: 'sticky', top: 49, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 49px)',
      overflowY: 'auto' }}>
      {/* progress */}
      <div style={{ marginBottom: 22, padding: '14px 14px', border: `1px solid ${T.line}`,
        borderRadius: 6, background: T.cardB }}>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: T.mono }}>прогресс курса</div>
        <div style={{ fontSize: 20, color: T.ink, fontWeight: 700, marginTop: 6, fontFamily: T.mono }}>
          1<span style={{ color: T.subtle, fontWeight: 400, fontSize: 14 }}> / 16 уроков</span>
        </div>
        <div style={{ marginTop: 10, height: 6, background: T.line, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: '6%', height: '100%',
            background: `linear-gradient(90deg, ${T.amber}, ${T.magenta})` }} />
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 8, fontFamily: T.mono }}>
          ~ 2ч 45м до конца курса
        </div>
      </div>

      {/* toc */}
      <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, textTransform: 'uppercase',
        fontFamily: T.mono, marginBottom: 10 }}>программа</div>

      {COURSE_TOC.map(mod => (
        <div key={mod.n} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.ink2,
            fontWeight: 600, marginBottom: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 3, background: mod.current ? T.amber : T.line,
              color: mod.current ? T.paper : T.muted, fontSize: 10, fontFamily: T.mono, fontWeight: 700 }}>{mod.n}</span>
            <span>{mod.title}</span>
          </div>
          {mod.lessons.map(l => (
            <a key={l.n} href="#" style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 8px 6px 30px', fontSize: 12.5, color: l.current ? T.ink : T.muted,
              textDecoration: 'none', borderRadius: 4, position: 'relative',
              background: l.current ? T.amberSoft : 'transparent', fontWeight: l.current ? 600 : 400 }}>
              {l.current && <span style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2, background: T.amber }} />}
              <span style={{ fontFamily: T.mono, fontSize: 10, color: l.current ? T.amber : T.subtle, minWidth: 24 }}>{l.n}</span>
              <span>{l.t}</span>
            </a>
          ))}
        </div>
      ))}
    </aside>
  );
}

// ---------- LESSON HEADER ----------
function LessonHeader({ T }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {/* breadcrumbs + meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: T.muted,
        fontFamily: T.mono, letterSpacing: 1, marginBottom: 18, flexWrap: 'wrap' }}>
        <span>модуль 00 — вводная</span>
        <span style={{ color: T.line2 }}>▸</span>
        <span style={{ color: T.amber }}>урок 0.1</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <PixelIcon grid={ICON_CLOCK} size={2} color={T.amber} pal={PAL_CLOCK} />
          20 мин основное
        </span>
        <span>+10 мин под капотом</span>
        <span style={{ padding: '2px 8px', background: T.amberSoft, color: T.amber, borderRadius: 2,
          fontSize: 10, letterSpacing: 1.5 }}>АКТУАЛЬНО · 22.04.26</span>
      </div>

      <h1 style={{ margin: 0, fontFamily: T.display, fontSize: 48, lineHeight: 1.05, letterSpacing: '-0.02em',
        color: T.ink, fontWeight: 700 }}>
        Что <SpecialText T={T}>вообще</SpecialText><br/>
        происходит
      </h1>
      <div style={{ marginTop: 8, fontSize: 16, color: T.muted, fontFamily: T.body }}>
        За 20 минут — в курсе того, о чём все говорят.
      </div>

      {/* цель — 1 строка */}
      <div style={{ marginTop: 22, padding: '14px 18px',
        borderLeft: `3px solid ${T.amber}`, background: T.amberSoft + '88',
        borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <PixelIcon grid={ICON_TARGET} size={3} pal={PAL_TARGET} />
        <div style={{ fontSize: 15, color: T.ink, lineHeight: 1.5, fontFamily: T.body }}>
          <b>После этого урока</b> ты сможешь за 2 минуты объяснить другу, что такое ИИ,
          какие есть ключевые модели и почему все сейчас говорят именно об этом.
        </div>
      </div>

      {/* progress bar of lesson */}
      <div style={{ marginTop: 18, height: 3, background: T.line, borderRadius: 2 }}>
        <div style={{ width: '0%', height: '100%', background: T.amber, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ---------- SUMMARY (collapsible) ----------
function SummaryBlock({ T }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginBottom: 14, border: `1px solid ${T.line}`, borderRadius: 6,
      background: T.cardA, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: 12, padding: '14px 18px',
        background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: T.body,
        color: T.ink, fontSize: 14, textAlign: 'left' }}>
        <PixelIcon grid={ICON_BOOK} size={2} pal={PAL_BOOK} />
        <span style={{ fontWeight: 600 }}>Саммари урока</span>
        <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono }}>~ 90 секунд чтения</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 18, color: T.muted,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>⌄</span>
      </button>
      {open && (
        <div style={{ padding: '4px 18px 18px 44px', fontSize: 14, color: T.ink2, lineHeight: 1.65,
          fontFamily: T.body, animation: 'pr-riseIn .25s ease-out' }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li><b>ИИ сейчас — это LLM</b> (большие языковые модели): GPT, Claude, Gemini, YandexGPT, GigaChat.</li>
            <li>Работают просто: <b>предсказывают следующее слово</b> на основе огромной статистики.</li>
            <li>За 5 дней ChatGPT собрал 1 млн пользователей. К 2026 — <b>900 млн в неделю</b>.</li>
            <li>Модели решают IMO-задачи на золото, но читают аналоговые часы в 50% случаев. <b>Ступенчатый интеллект</b>.</li>
            <li>Ключевой сдвиг 2025–2026: генеративный → <b>агентный ИИ</b> (делает шаги сам, не только отвечает).</li>
            <li><b>Что забираешь:</b> карточка «Главные модели 2026» + первый осознанный диалог с ИИ.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- AUDIO PLAYER ----------
function AudioBlock({ T }) {
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0); // 0..1
  const [speed, setSpeed] = React.useState(1);
  const DURATION = 14 * 60 + 30; // 14:30

  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress(p => {
        const np = p + (0.5 * speed) / DURATION;
        if (np >= 1) { setPlaying(false); return 1; }
        return np;
      });
    }, 500);
    return () => clearInterval(id);
  }, [playing, speed]);

  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  // bar animation
  const bars = 28;
  return (
    <div style={{ marginBottom: 28, border: `1px solid ${T.line}`, borderRadius: 6,
      background: T.cardA, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
      fontFamily: T.body }}>
      <button onClick={() => setPlaying(!playing)} style={{
        width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: T.amber, color: T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0, boxShadow: `0 0 0 4px ${T.amberSoft}` }}>
        {playing ? '❚❚' : '▶'}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.muted, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: T.ink }}>Аудио-пересказ</span>
          <span>·</span>
          <span style={{ fontFamily: T.mono }}>голос автора</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(progress * DURATION)} / {fmt(DURATION)}
          </span>
        </div>
        {/* waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 28, cursor: 'pointer' }}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setProgress((e.clientX - r.left) / r.width); }}>
          {Array.from({ length: bars }).map((_, i) => {
            const played = i / bars < progress;
            const h = [10, 16, 22, 14, 8, 20, 26, 18, 12, 22, 16, 10, 24, 20, 14, 18, 26, 12, 8, 14, 22, 16, 20, 10, 18, 24, 14, 8][i] || 12;
            return (
              <div key={i} style={{
                flex: 1, height: h, borderRadius: 1, background: played ? T.amber : T.line2,
                transition: 'background .2s',
                animation: playing && played ? `pr-breath ${0.6 + (i % 4) * 0.2}s ease-in-out infinite ${i * 0.05}s` : 'none',
              }} />
            );
          })}
        </div>
      </div>
      <button onClick={() => setSpeed(s => s === 1 ? 1.25 : s === 1.25 ? 1.5 : s === 1.5 ? 2 : 1)}
        style={{ padding: '6px 10px', border: `1px solid ${T.line2}`, borderRadius: 4,
        background: 'transparent', cursor: 'pointer', fontFamily: T.mono, fontSize: 11, color: T.muted }}>
        {speed}×
      </button>
    </div>
  );
}

// ---------- H2 RU ----------
function H2({ icon, num, children, T }) {
  // icon is a string name from ICON_REGISTRY
  return (
    <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '40px 0 18px',
      fontFamily: T.display, fontSize: 24, color: T.ink, fontWeight: 700, letterSpacing: '-0.01em' }}>
      {icon && <Icon name={icon} size={3} />}
      {num && <span style={{ fontFamily: T.mono, fontSize: 13, color: T.muted, letterSpacing: 2 }}>{num}</span>}
      <span style={{ flex: 1 }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: T.line }} />
    </h2>
  );
}

// ---------- HOOK-BLOCK ----------
function HookBlock({ T }) {
  // визуальный график: 3 бара с подписями
  const bars = [
    { label: 'Facebook', days: 365, formatted: 'почти год' },
    { label: 'Instagram', days: 75, formatted: '2,5 месяца' },
    { label: 'ChatGPT', days: 5, formatted: '5 дней', highlight: true },
  ];
  const max = 365;
  return (
    <div style={{ margin: '10px 0 24px', padding: '18px 22px 22px',
      border: `2px dashed ${T.magenta}`, borderRadius: 6,
      background: `linear-gradient(135deg, ${T.paper}, ${T.tealSoft}44)`,
      position: 'relative', overflow: 'hidden', fontFamily: T.body }}>
      <div style={{ position: 'absolute', top: 8, right: 12, opacity: .5 }}>
        <Icon name="bolt" size={2} />
      </div>
      <div style={{ fontSize: 10, color: T.magenta, letterSpacing: 3, textTransform: 'uppercase',
        fontFamily: T.mono, fontWeight: 700, marginBottom: 12 }}>
        ◆ зацеп · 45 секунд
      </div>
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: T.ink, fontWeight: 500 }}>
        За 5 дней после запуска у ChatGPT было <b style={{ color: T.magenta }}>1 миллион пользователей</b>.
        Instagram шёл к миллиону 2,5 месяца. Facebook — почти год.
      </p>

      {/* время до 1M — визуально */}
      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        {bars.map(b => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <div style={{ width: 84, color: T.ink2, fontFamily: T.mono, fontSize: 11, letterSpacing: .5 }}>
              {b.label}
            </div>
            <div style={{ flex: 1, height: 16, background: T.line, borderRadius: 2, overflow: 'hidden',
              display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div style={{
                height: '100%',
                width: `${(b.days / max) * 100}%`,
                background: b.highlight ? `linear-gradient(90deg, ${T.magenta}, ${T.amber})` : T.line2,
                borderRadius: 2,
              }} />
            </div>
            <div style={{ width: 96, textAlign: 'right', fontFamily: T.mono, fontSize: 11,
              color: b.highlight ? T.magenta : T.muted, fontWeight: b.highlight ? 700 : 400 }}>
              {b.formatted}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 2, fontSize: 10, color: T.subtle, fontFamily: T.mono, letterSpacing: .5 }}>
          время от запуска до 1 млн пользователей · источник: Reuters
        </div>
      </div>

      <p style={{ margin: '16px 0 0', fontSize: 14, lineHeight: 1.6, color: T.ink2 }}>
        К апрелю 2026 у ChatGPT — <b>900 миллионов активных пользователей в неделю</b>.
        Это не мода. Это самая быстрая технологическая революция, которую проживало человечество.
        Если кажется, что ты отстал — это нормально. <b>Весь мир отстал.</b> Разница в том,
        кто начнёт догонять сейчас.
      </p>
    </div>
  );
}

// ---------- CHAT ILLUSION ----------
// Блок закрыт, пока пользователь не нажмёт кнопку-призыв.
function ChatRevealBlock({ T, prompt, userSays, children }) {
  const [revealed, setRevealed] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const onClick = () => {
    setTyping(true);
    setTimeout(() => { setTyping(false); setRevealed(true); }, 700);
  };
  return (
    <div style={{ margin: '18px 0 28px', fontFamily: T.body }}>
      {!revealed ? (
        <div style={{ padding: '18px 20px', border: `1px solid ${T.line}`, borderRadius: 6,
          background: T.cardB, display: 'flex', alignItems: 'center', gap: 14 }}>
          <UserAvatar size={32} T={T} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: T.mono }}>
              твой ход
            </div>
            <div style={{ fontSize: 14, color: T.ink, marginTop: 2 }}>{prompt}</div>
          </div>
          <button onClick={onClick} disabled={typing} style={{
            padding: '10px 18px', border: 'none', borderRadius: 4,
            background: T.amber, color: T.paper, cursor: typing ? 'wait' : 'pointer',
            fontFamily: T.body, fontSize: 13, fontWeight: 600, letterSpacing: .5,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            {typing ? <>
              <span style={{ display: 'inline-flex', gap: 3 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.paper, animation: 'pr-pulse 1s infinite' }} />
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.paper, animation: 'pr-pulse 1s infinite .2s' }} />
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.paper, animation: 'pr-pulse 1s infinite .4s' }} />
              </span>
            </> : <>{userSays || 'Давай разберёмся'} <span>→</span></>}
          </button>
        </div>
      ) : (
        <div style={{ animation: 'pr-riseIn .35s ease-out' }}>
          {/* user bubble */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 14 }}>
            <div style={{ maxWidth: 480, padding: '10px 14px', background: T.userBubble,
              borderRadius: '14px 14px 2px 14px', fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>
              {userSays || 'Давай разберёмся'}
            </div>
            <UserAvatar size={32} T={T} />
          </div>
          {/* coach bubble */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <CoachAvatar size={32} T={T} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, marginBottom: 4 }}>
                Александр · автор курса
              </div>
              <div style={{ padding: '14px 18px', background: T.botBubble, border: `1px solid ${T.line}`,
                borderRadius: '2px 14px 14px 14px', fontSize: 14, color: T.ink2, lineHeight: 1.65 }}>
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- COROLLARY CARD ----------
function Corollary({ n, title, body, T, color }) {
  return (
    <div style={{ padding: '18px 20px', border: `1px solid ${T.line}`, borderRadius: 6,
      background: T.cardA, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: color }} />
      <div style={{ fontSize: 10, color, letterSpacing: 2, textTransform: 'uppercase',
        fontFamily: T.mono, fontWeight: 700 }}>Следствие {n}</div>
      <div style={{ fontSize: 16, color: T.ink, fontWeight: 600, margin: '6px 0 8px',
        fontFamily: T.display }}>{title}</div>
      <div style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6, fontFamily: T.body }}>{body}</div>
    </div>
  );
}

// ---------- COMPARISON TABLE ----------
function ComparisonTable({ T }) {
  const rows = [
    ['предсказывает следующее слово', 'знает «истину»'],
    ['держит в голове твой контекст', 'помнит прошлые разговоры'],
    ['пишет связный текст', 'считает сложные числа в уме'],
    ['перефразирует, структурирует', 'отвечает за свои слова'],
    ['генерирует варианты', 'проверяет факты сам'],
  ];
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 6, overflow: 'hidden',
      background: T.cardA, fontFamily: T.body }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: '10px 16px', background: T.amberSoft, fontSize: 11,
          color: T.amber, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, fontFamily: T.mono }}>
          ✓ делает хорошо
        </div>
        <div style={{ padding: '10px 16px', background: '#F8D7D7', fontSize: 11,
          color: T.red, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, fontFamily: T.mono,
          borderLeft: `1px solid ${T.line}` }}>
          ✗ делает плохо
        </div>
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.line}`, fontSize: 13.5, color: T.ink2 }}>
              — {r[0]}
            </div>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.line}`, borderLeft: `1px solid ${T.line}`,
              fontSize: 13.5, color: T.ink2 }}>
              — {r[1]}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---------- INTERACTIVE: 3 формулировки ----------
function ThreeFormulations({ T }) {
  const VARIANTS = [
    { label: 'Расплывчатая', prompt: 'Что такое инфляция?',
      answer: 'Инфляция — это устойчивый рост общего уровня цен на товары и услуги в экономике. Она приводит к снижению покупательной способности денег...',
      score: 2, tag: 'учебник' },
    { label: 'С ролью', prompt: 'Ты экономист, объясни инфляцию студенту первого курса в 5 предложениях',
      answer: 'Представь: в прошлом году мороженое стоило 100 ₽, сейчас — 110 ₽. Это и есть инфляция: постепенный рост цен. Происходит это из-за того, что денег в экономике становится больше, чем товаров...',
      score: 4, tag: 'пример' },
    { label: 'С контекстом', prompt: 'Объясни инфляцию моей бабушке через пример цен на хлеб за 20 лет. Без терминов. 3 абзаца, каждый — одна мысль.',
      answer: 'Помните, в 2005-м хлеб стоил 12 рублей? Тот же батон сейчас — 80. Хлеб не стал в 7 раз лучше. Это деньги стали слабее. Каждая рублёвая монетка из 2005-го сегодня может купить меньше...',
      score: 5, tag: 'история' },
  ];
  const [sel, setSel] = React.useState(2);
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 6, background: T.cardA,
      overflow: 'hidden', fontFamily: T.body }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex',
        alignItems: 'center', gap: 10, background: T.cardB }}>
        <Icon name="bolt" size={2} />
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>
          Тренажёр · Один вопрос, три формулировки
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5, fontFamily: T.mono }}>T03</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: T.line }}>
        {VARIANTS.map((v, i) => {
          const active = sel === i;
          return (
            <button key={i} onClick={() => setSel(i)} style={{
              padding: '14px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
              background: active ? T.amberSoft : T.cardA, color: T.ink, fontFamily: 'inherit' }}>
              <div style={{ fontSize: 10, color: active ? T.amber : T.muted,
                letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: T.mono, fontWeight: 700, marginBottom: 6 }}>
                вариант {i + 1} · {v.label}
              </div>
              <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>«{v.prompt}»</div>
            </button>
          );
        })}
      </div>
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, letterSpacing: 1.5 }}>ОТВЕТ МОДЕЛИ</span>
          <span style={{ padding: '2px 8px', background: T.tealSoft, color: T.teal,
            fontSize: 10, fontFamily: T.mono, letterSpacing: 1 }}>{VARIANTS[sel].tag}</span>
          <span style={{ flex: 1 }} />
          <span style={{ display: 'flex', gap: 2 }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{ width: 10, height: 10,
                background: n <= VARIANTS[sel].score ? T.amber : T.line, borderRadius: 2 }} />
            ))}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: T.ink, lineHeight: 1.65 }}>
          {VARIANTS[sel].answer}
        </p>
      </div>
    </div>
  );
}

// ---------- DEEP DIVE ----------
function DeepDive({ T }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginTop: 36, border: `1px solid ${T.line2}`, borderRadius: 6,
      background: `linear-gradient(180deg, ${T.cardB}, ${T.cardA})`, overflow: 'hidden', fontFamily: T.body }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: 14, padding: '16px 20px',
        background: 'transparent', border: 'none', cursor: 'pointer', color: T.ink, textAlign: 'left' }}>
        {/* маленький пакман — как «pull pacman» */}
        <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 11 11" shapeRendering="crispEdges">
            {PAC_CLOSED_GRID.flatMap((row, y) => row.map((v, x) => v ? (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={T.amber} />
            ) : v === 2 ? null : null))}
          </svg>
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: T.amber, letterSpacing: 2, textTransform: 'uppercase',
            fontFamily: T.mono, fontWeight: 700 }}>под капотом · +10 минут</div>
          <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, marginTop: 4 }}>
            Как из нейросети получается «текст»
          </div>
        </div>
        <span style={{ fontSize: 18, color: T.amber,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>⌄</span>
      </button>
      {open && (
        <div style={{ padding: '4px 22px 22px 62px', fontFamily: T.body, animation: 'pr-riseIn .25s ease-out' }}>
          <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.65 }}>
            Технически, модель — это огромная матричная функция. На вход подаётся последовательность токенов,
            на выходе — вероятностное распределение по всему словарю (часто 50 000+ токенов). Модель выбирает один
            и добавляет в последовательность. Повторяет. До конца ответа.
          </p>
          <div style={{ marginTop: 14, padding: '14px 16px', background: T.codeBg, borderRadius: 4,
            fontFamily: T.mono, fontSize: 12.5, color: T.codeFg, lineHeight: 1.7 }}>
            <div><span style={{ color: T.muted }}>// temperature = 0</span> → <span style={{ color: T.teal }}>детерминированные</span>, повторяемые ответы</div>
            <div><span style={{ color: T.muted }}>// temperature = 0.7</span> → баланс <span style={{ color: T.teal }}>креативности</span> и связности</div>
            <div><span style={{ color: T.muted }}>// temperature &gt; 1</span> → повышенная <span style={{ color: T.magenta }}>творческость</span>, иногда на грани бессмыслицы</div>
          </div>
          <div style={{ marginTop: 16, padding: '14px 16px', border: `1px dashed ${T.line2}`,
            borderRadius: 4, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="brain" size={2} />
            <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>
              <b>Контекстное окно</b> — сколько токенов модель «видит» за раз. GPT-4.1 — 128k, Claude Sonnet 4.5 — 200k, Gemini 2.5 Pro — до 1M+.
              Если разговор длинный, ранние части «забываются».
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- ARTIFACT CARD ----------
function ArtifactBlock({ T }) {
  return (
    <div style={{ marginTop: 10, padding: '20px 22px', border: `2px solid ${T.amber}`, borderRadius: 6,
      background: `linear-gradient(135deg, ${T.paper}, ${T.amberSoft}88)`, fontFamily: T.body,
      display: 'flex', gap: 18, alignItems: 'flex-start' }}>
      <Icon name="flag" size={4} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: T.amber, letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: T.mono, fontWeight: 700 }}>◆ что забираешь</div>
        <div style={{ fontSize: 17, color: T.ink, fontWeight: 600, margin: '4px 0 6px', fontFamily: T.display }}>
          Карточка-памятка «Что ИИ делает и чего не делает»
        </div>
        <p style={{ margin: 0, fontSize: 13, color: T.ink2, lineHeight: 1.55 }}>
          Добавляется в твой «рюкзак» и в Prompt-бук Модуля 1.
        </p>
      </div>
      <button style={{ padding: '10px 16px', background: T.amber, color: T.paper, border: 'none',
        borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: 1,
        textTransform: 'uppercase', fontFamily: T.body }}>↓ PDF</button>
    </div>
  );
}

// ---------- IMAGE PLACEHOLDER ----------
function ImagePlaceholder({ prompt, T }) {
  return (
    <div style={{ margin: '18px 0', border: `1px dashed ${T.line2}`, borderRadius: 6,
      background: T.cardB, padding: '16px 18px', fontFamily: T.body }}>
      <div style={{ height: 220, background: `repeating-linear-gradient(45deg, ${T.line} 0 8px, ${T.cardB} 8px 16px)`,
        borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.muted, fontFamily: T.mono, fontSize: 12 }}>
        [ изображение будет сгенерировано автором ]
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="gear" size={2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: T.mono }}>промпт</div>
          <div style={{ fontSize: 12, color: T.ink2, fontFamily: T.mono, marginTop: 2, lineHeight: 1.5 }}>{prompt}</div>
        </div>
      </div>
    </div>
  );
}

// ---------- CALLOUT (Obsidian style) ----------
function Callout({ kind = 'info', title, children, T }) {
  const cfg = {
    info:    { c: T.teal,    bg: T.tealSoft,    label: 'Важно',    icon: ICON_CHECK, pal: PAL_CHECK_TEAL },
    warn:    { c: T.red,     bg: '#F8D7D7',     label: 'Осторожно',icon: ICON_WARN,  pal: PAL_WARN },
    quote:   { c: T.magenta, bg: '#FADBE5',     label: 'Цитата',   icon: ICON_QUOTE, pal: PAL_QUOTE },
    tip:     { c: T.amber,   bg: T.amberSoft,   label: 'Совет',    icon: ICON_BULB,  pal: PAL_BULB },
  }[kind];
  return (
    <div style={{ margin: '16px 0', border: `1px solid ${cfg.c}44`, borderLeft: `4px solid ${cfg.c}`,
      borderRadius: 4, background: cfg.bg + '77', padding: '14px 18px', fontFamily: T.body }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <PixelIcon grid={cfg.icon} size={2} pal={cfg.pal} />
        <span style={{ fontSize: 11, color: cfg.c, letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: T.mono, fontWeight: 700 }}>{title || cfg.label}</span>
      </div>
      <div style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// ---------- NAV (prev/next) ----------
function LessonNav({ T }) {
  return (
    <div style={{ marginTop: 44, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: T.body }}>
      <a href="#" style={{
        padding: '18px 20px', border: `1px solid ${T.line}`, borderRadius: 6, background: T.cardA,
        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all .2s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.amber; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; }}>
        <Icon name="arrow" size={3} pal={PAL_ARROW_MUTED} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: T.mono }}>
            ← предыдущий
          </div>
          <div style={{ fontSize: 14, color: T.ink, fontWeight: 600, marginTop: 2 }}>0.2 · Твоя точка А</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Диагностика до старта курса</div>
        </div>
      </a>
      <a href="#" style={{
        padding: '18px 20px', border: `1px solid ${T.amber}`, borderRadius: 6,
        background: `linear-gradient(135deg, ${T.amberSoft}, ${T.cardA})`,
        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: T.amber, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: T.mono }}>
            следующий →
          </div>
          <div style={{ fontSize: 14, color: T.ink, fontWeight: 600, marginTop: 2 }}>1.2 · Анатомия хорошего промпта</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>5 элементов рабочего запроса</div>
        </div>
        <div style={{ transform: 'scaleX(-1)' }}>
          <Icon name="arrow" size={3} />
        </div>
      </a>
    </div>
  );
}

// ---------- SOURCES BLOCK ----------
function SourcesBlock({ T }) {
  const sources = [
    { t: '3Blue1Brown · But what is a neural network?', url: 'youtube.com/@3blue1brown', type: 'Видео · 19 мин' },
    { t: 'Andrej Karpathy · Intro to Large Language Models', url: 'youtube.com/@AndrejKarpathy', type: 'Видео · 1 ч' },
    { t: 'Stephen Wolfram · What is ChatGPT Doing…', url: 'writings.stephenwolfram.com', type: 'Статья · 40 мин' },
    { t: 'Anthropic · Mapping the Mind of a LLM', url: 'anthropic.com/research', type: 'Research · 25 мин' },
  ];
  return (
    <div id="sources" style={{ marginTop: 36, padding: '20px 22px', border: `1px solid ${T.line}`,
      borderRadius: 6, background: T.cardA, fontFamily: T.body }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Icon name="book" size={2} />
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: T.mono, fontWeight: 700 }}>источники урока</div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: T.subtle, fontFamily: T.mono }}>необязательно</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {sources.map((s, i) => (
          <a key={i} href="#" style={{ padding: '12px 14px', border: `1px solid ${T.line}`,
            borderRadius: 4, background: T.paper, textDecoration: 'none', display: 'block',
            transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.amber; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; }}>
            <div style={{ fontSize: 10, color: T.amber, letterSpacing: 1.5, textTransform: 'uppercase',
              fontFamily: T.mono, fontWeight: 700, marginBottom: 4 }}>{s.type}</div>
            <div style={{ fontSize: 13, color: T.ink, fontWeight: 600, lineHeight: 1.4 }}>{s.t}</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, marginTop: 4 }}>↗ {s.url}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ---------- DISCUSSION ----------
function DiscussionBlock({ T }) {
  const comments = [
    { who: 'Мария К.', role: 'SMM-менеджер',
      text: 'Первый раз кто-то объяснил без магии и без «ИИ заменит всех». Пошла переписывать свои три сохранённых промпта в Notion.',
      ago: '2 часа назад', likes: 14, color: T.amber },
    { who: 'Дмитрий Б.', role: 'Юрист · M&A',
      text: 'Про «уверенность ≠ правота» — золото. У меня ChatGPT как-то выдумал несуществующий прецедент Верховного суда с идеальной ссылкой. С тех пор всё проверяю.',
      ago: '5 часов назад', likes: 31, color: T.magenta },
    { who: 'Аня Т.', role: 'Преподаватель',
      text: 'Можно ли использовать этот урок как вводный для своих студентов? (обязательно укажу автора)',
      ago: 'вчера', likes: 7, color: T.teal, reply: 'Конечно, Ань — ссылка и имя. Буду рад. — А.Пронин' },
  ];
  return (
    <div style={{ marginTop: 36, fontFamily: T.body }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Icon name="chat" size={2} />
        <div style={{ fontSize: 14, color: T.ink, fontWeight: 700 }}>Обсуждение урока</div>
        <span style={{ padding: '1px 8px', background: T.amberSoft, color: T.amber,
          fontSize: 10, fontFamily: T.mono, letterSpacing: 1, borderRadius: 2 }}>47</span>
        <span style={{ flex: 1 }} />
        <a href="#" style={{ fontSize: 11, color: T.muted, fontFamily: T.mono,
          letterSpacing: 1.5, textTransform: 'uppercase', textDecoration: 'none' }}>
          смотреть все →
        </a>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {comments.map((c, i) => (
          <div key={i} style={{ padding: '14px 16px', border: `1px solid ${T.line}`, borderRadius: 6,
            background: T.cardA, display: 'flex', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 4, background: c.color,
              color: T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {c.who[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>{c.who}</span>
                <span style={{ fontSize: 11, color: T.muted }}>· {c.role}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: T.subtle, fontFamily: T.mono }}>{c.ago}</span>
              </div>
              <p style={{ margin: '6px 0 8px', fontSize: 13.5, color: T.ink2, lineHeight: 1.55 }}>{c.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: T.muted,
                fontFamily: T.mono, letterSpacing: .5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>▲ {c.likes}</span>
                <a href="#" style={{ color: T.muted, textDecoration: 'none' }}>↳ ответить</a>
                <a href="#" style={{ color: T.subtle, textDecoration: 'none' }}>···</a>
              </div>
              {c.reply && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: T.cardB,
                  borderLeft: `2px solid ${T.amber}`, borderRadius: '0 4px 4px 0' }}>
                  <div style={{ fontSize: 11, color: T.amber, fontFamily: T.mono,
                    letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                    автор курса
                  </div>
                  <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.55 }}>{c.reply}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* compose */}
      <div style={{ marginTop: 14, padding: '12px 14px', border: `1px dashed ${T.line2}`, borderRadius: 6,
        background: T.cardB, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 4, background: T.amber,
          color: T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Т</div>
        <div style={{ flex: 1, fontSize: 12.5, color: T.muted }}>
          Что сработало? Что вызвало сопротивление?
        </div>
        <button style={{ padding: '7px 14px', background: T.amber, color: T.paper,
          border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700,
          letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: T.body }}>
          написать
        </button>
      </div>
    </div>
  );
}

// ---------- RELATED LESSONS ----------
function RelatedBlock({ T }) {
  const items = [
    { n: '1.2', t: 'Анатомия хорошего промпта', desc: 'Пять элементов любого рабочего запроса', tag: 'следующий', color: T.amber },
    { n: '0.1', t: 'Масштаб изменений', desc: 'Почему этот урок нужен именно сейчас', tag: 'контекст', color: T.teal },
    { n: '2.2', t: 'NotebookLM', desc: 'Дальше — научим ИИ работать с твоими документами', tag: 'забегая вперёд', color: T.magenta },
  ];
  return (
    <div style={{ marginTop: 36, fontFamily: T.body }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Icon name="bulb" size={2} />
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: T.mono, fontWeight: 700 }}>связанные уроки</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {items.map((l, i) => (
          <a key={i} href="#" style={{ padding: '14px 14px', border: `1px solid ${T.line}`,
            borderRadius: 6, background: T.cardA, textDecoration: 'none', display: 'block',
            transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = l.color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: l.color, fontWeight: 700,
                letterSpacing: 1.5 }}>{l.n}</span>
              <span style={{ padding: '1px 6px', background: l.color + '22', color: l.color,
                fontSize: 9, fontFamily: T.mono, letterSpacing: 1, borderRadius: 2,
                textTransform: 'uppercase' }}>{l.tag}</span>
            </div>
            <div style={{ fontSize: 13, color: T.ink, fontWeight: 600, lineHeight: 1.3 }}>{l.t}</div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginTop: 4 }}>{l.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ---------- LESSON FOOTER ----------
function LessonFooter({ T }) {
  return (
    <footer style={{ marginTop: 48, padding: '28px 0 0', borderTop: `1px solid ${T.line}`,
      fontFamily: T.body }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.mono,
            fontSize: 13, color: T.ink, fontWeight: 600 }}>
            <span style={{ color: T.amber }}>❯</span> курс.ии
          </div>
          <p style={{ fontSize: 12, color: T.muted, margin: '10px 0 0', lineHeight: 1.55, maxWidth: 300 }}>
            Бесплатный курс от Александра Пронина. ИИ — это твой экзоскелет:
            учит тебя, считает за тебя, пишет с тобой.
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <a href="#" style={{ padding: '5px 10px', border: `1px solid ${T.line}`, borderRadius: 4,
              color: T.muted, textDecoration: 'none', fontSize: 11, fontFamily: T.mono,
              letterSpacing: 1 }}>@alex_pronin</a>
            <a href="#" style={{ padding: '5px 10px', border: `1px solid ${T.line}`, borderRadius: 4,
              color: T.muted, textDecoration: 'none', fontSize: 11, fontFamily: T.mono,
              letterSpacing: 1 }}>github</a>
          </div>
        </div>
        <div style={{ flex: '0 1 auto' }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, textTransform: 'uppercase',
            fontFamily: T.mono, marginBottom: 8 }}>навигация</div>
          {['к курсам', 'к модулям', 'мой прогресс', 'выйти'].map(l => (
            <a key={l} href="#" style={{ display: 'block', padding: '4px 0', fontSize: 12,
              color: T.ink2, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <div style={{ flex: '0 1 auto' }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, textTransform: 'uppercase',
            fontFamily: T.mono, marginBottom: 8 }}>материалы</div>
          {['все промпты', 'все артефакты', 'источники', 'FAQ'].map(l => (
            <a key={l} href="#" style={{ display: 'block', padding: '4px 0', fontSize: 12,
              color: T.ink2, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <div style={{ flex: '0 1 auto' }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, textTransform: 'uppercase',
            fontFamily: T.mono, marginBottom: 8 }}>горячие клавиши</div>
          {[['J / K', 'след. / пред.'], ['⌘ + K', 'поиск по курсу'], ['M', 'саммари'], ['?', 'все клавиши']].map(([k, l]) => (
            <div key={k} style={{ display: 'flex', gap: 10, padding: '4px 0', fontSize: 12,
              color: T.ink2 }}>
              <kbd style={{ padding: '1px 6px', fontFamily: T.mono, fontSize: 10,
                border: `1px solid ${T.line2}`, borderRadius: 3, background: T.cardA,
                color: T.muted, minWidth: 52, textAlign: 'center' }}>{k}</kbd>
              <span style={{ color: T.muted }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 28, padding: '14px 0 0', borderTop: `1px dashed ${T.line}`,
        display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: T.subtle,
        fontFamily: T.mono, letterSpacing: .5, flexWrap: 'wrap' }}>
        <span>© 2026 · курс.ии</span>
        <span style={{ color: T.line2 }}>·</span>
        <span>актуально на 21.04.26</span>
        <span style={{ color: T.line2 }}>·</span>
        <span>следующая ревизия 21.05.26</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green }} />
          все системы работают
        </span>
      </div>
    </footer>
  );
}

// ---------- AI TIMELINE (C05) ----------
const TIMELINE_EVENTS = [
  { date: 'Июнь 2020', label: 'GPT-3', hl: 'neutral',
    desc: 'Первая модель, которая убедительно пишет «как человек». 175 млрд параметров. До этого LLM были академической игрушкой.',
    src: 'OpenAI · arXiv 2005.14165' },
  { date: 'Ноябрь 2022', label: 'ChatGPT', hl: 'primary',
    desc: '1 миллион пользователей за 5 дней — мировой рекорд. Момент, когда ИИ вышел из лабораторий в массу.',
    src: 'Reuters' },
  { date: 'Март 2023', label: 'GPT-4', hl: 'neutral',
    desc: 'Сдаёт юридический экзамен в топ-10% выпускников юрфака США. Первая модель, сравнимая с человеком-экспертом в когнитивных задачах.',
    src: 'Reuters · GPT-4' },
  { date: 'Сентябрь 2024', label: 'o1 от OpenAI', hl: 'neutral',
    desc: 'Модель начинает «думать перед ответом» — сначала рассуждает шагами, потом отвечает. Резкий скачок качества в математике и логике.',
    src: 'LifeArchitect · o1' },
  { date: 'Январь 2025', label: 'DeepSeek R1', hl: 'info',
    desc: 'Открытые веса, уровень GPT-4 за копейки. Китай показывает: монополии топ-моделей нет, догонять можно дёшево.',
    src: null },
  { date: '2025–2026', label: 'GPT-5 · Claude 4.x · Gemini 3', hl: 'primary',
    desc: 'Докторский уровень в естественных науках. GPQA Diamond ~87%, выше человека-эксперта (81,2%).',
    src: 'Stanford AI Index 2026' },
  { date: '2025–2026', label: 'Агентные системы', hl: 'success',
    desc: 'ИИ переходит от «ответить» к «сделать». OSWorld: 12% → 66% за год. Следующий большой сдвиг.',
    src: 'Stanford AI Index 2026' },
];

function AITimeline({ T }) {
  const [open, setOpen] = React.useState(1); // по умолчанию открыт ChatGPT
  const clrFor = (hl) => ({
    primary: T.amber,
    success: T.teal,
    info:    T.magenta,
    neutral: T.muted,
  }[hl] || T.muted);

  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 6, background: T.cardA,
      overflow: 'hidden', fontFamily: T.body }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex',
        alignItems: 'center', gap: 10, background: T.cardB }}>
        <Icon name="clock" size={2} />
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>
          Ключевые точки ИИ 2020 → 2026
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5, fontFamily: T.mono }}>C05</span>
      </div>
      <div style={{ padding: '20px 22px' }}>
        {TIMELINE_EVENTS.map((e, i) => {
          const active = open === i;
          const c = clrFor(e.hl);
          const last = i === TIMELINE_EVENTS.length - 1;
          return (
            <div key={i} style={{ display: 'flex', gap: 14, position: 'relative' }}>
              {/* rail */}
              <div style={{ width: 14, flexShrink: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center' }}>
                <button onClick={() => setOpen(active ? -1 : i)} style={{
                  width: 14, height: 14, borderRadius: '50%', border: `2px solid ${c}`,
                  background: active ? c : T.paper, cursor: 'pointer', padding: 0,
                  boxShadow: active ? `0 0 0 4px ${c}33` : 'none',
                  transition: 'all .2s', marginTop: 4 }} />
                {!last && <div style={{ flex: 1, width: 2, background: T.line, minHeight: active ? 16 : 24 }} />}
              </div>
              {/* content */}
              <div style={{ flex: 1, paddingBottom: last ? 0 : (active ? 14 : 20) }}>
                <button onClick={() => setOpen(active ? -1 : i)} style={{
                  display: 'flex', alignItems: 'baseline', gap: 10, width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  fontFamily: 'inherit' }}>
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: c,
                    letterSpacing: 1.5, fontWeight: 700, minWidth: 100 }}>
                    {e.date.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 14, color: T.ink, fontWeight: active ? 700 : 600 }}>
                    {e.label}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: T.subtle }}>{active ? '−' : '+'}</span>
                </button>
                {active && (
                  <div style={{ marginTop: 8, padding: '10px 14px', background: T.cardB,
                    borderLeft: `3px solid ${c}`, borderRadius: '0 4px 4px 0',
                    animation: 'pr-riseIn .2s ease-out' }}>
                    <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{e.desc}</div>
                    {e.src && (
                      <div style={{ marginTop: 6, fontSize: 10, color: T.muted, fontFamily: T.mono,
                        letterSpacing: 1, textTransform: 'uppercase' }}>
                        ↗ {e.src}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- STATS GRID (что умеют сегодня) ----------
function CapabilitiesGrid({ T }) {
  const items = [
    { v: '🏅', t: 'IMO золото', d: 'Международная мат. олимпиада, топ-модели 2025' },
    { v: '87%', t: 'GPQA Diamond', d: 'выше человека-эксперта (81,2%)' },
    { v: '~100%', t: 'SWE-bench', d: 'реальные баги в open-source, 2025' },
    { v: '4 в 1', t: 'мультимодальность', d: 'текст · голос · видео · картинки' },
    { v: 'ReAct', t: 'думают шагами', d: 'o1, Gemini 2.5, DeepSeek R1' },
    { v: '50%', t: 'часы', d: 'аналоговые стрелки — половина правильно. Человек — 90%' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
      fontFamily: T.body, margin: '12px 0 18px' }}>
      {items.map((it, i) => {
        const isWeakness = i === items.length - 1;
        return (
          <div key={i} style={{ padding: '14px 14px', border: `1px solid ${T.line}`,
            borderRadius: 6, background: isWeakness ? '#F8D7D744' : T.cardA,
            borderLeft: `3px solid ${isWeakness ? T.red : T.teal}` }}>
            <div style={{ fontFamily: T.display, fontSize: 22, color: isWeakness ? T.red : T.teal,
              fontWeight: 700, lineHeight: 1 }}>{it.v}</div>
            <div style={{ fontSize: 12, color: T.ink, fontWeight: 600, marginTop: 6 }}>{it.t}</div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginTop: 2 }}>{it.d}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- MODELS MAP ----------
function ModelsMap({ T }) {
  const groups = [
    { tag: 'мировые', c: T.amber, models: [
      { n: 'GPT-5', by: 'OpenAI', d: 'универсал · письмо · рассуждение' },
      { n: 'Claude Opus 4.5', by: 'Anthropic', d: 'программирование · агенты' },
      { n: 'Gemini 2.5 / 3 Pro', by: 'Google', d: 'длинный контекст · образование' },
      { n: 'Grok 4', by: 'xAI', d: 'свежие данные · прямой стиль' },
    ]},
    { tag: 'открытые · китайские', c: T.teal, models: [
      { n: 'DeepSeek V3 / R1', by: 'DeepSeek', d: 'открытые веса · догоняет за копейки' },
    ]},
    { tag: 'российские', c: T.magenta, models: [
      { n: 'YandexGPT 5.1 Pro', by: 'Яндекс', d: 'лидер в русскоязычных задачах' },
      { n: 'GigaChat 2 MAX / Ultra', by: 'Сбер', d: 'заявлен уровень GPT-4 · Ultra → GPT-5' },
    ]},
  ];
  return (
    <div style={{ display: 'grid', gap: 14, fontFamily: T.body, margin: '12px 0 18px' }}>
      {groups.map((g, i) => (
        <div key={i}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, background: g.c, borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: g.c, letterSpacing: 2, textTransform: 'uppercase',
              fontFamily: T.mono, fontWeight: 700 }}>{g.tag}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(g.models.length, 4)}, 1fr)`,
            gap: 8 }}>
            {g.models.map((m, j) => (
              <div key={j} style={{ padding: '12px 14px', border: `1px solid ${T.line}`,
                borderLeft: `3px solid ${g.c}`, borderRadius: 4, background: T.cardA }}>
                <div style={{ fontSize: 13, color: T.ink, fontWeight: 700 }}>{m.n}</div>
                <div style={{ fontSize: 10, color: g.c, fontFamily: T.mono, letterSpacing: 1,
                  textTransform: 'uppercase', marginTop: 2 }}>{m.by}</div>
                <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.5, marginTop: 4 }}>{m.d}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- MONEY BIG NUMBER ----------
function BigMoneyBlock({ T }) {
  return (
    <div style={{ margin: '14px 0 18px', padding: '22px 24px',
      border: `1px solid ${T.line}`, borderRadius: 6,
      background: `linear-gradient(135deg, ${T.cardA}, ${T.amberSoft}44)`,
      fontFamily: T.body, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: '0 0 auto' }}>
        <div style={{ fontFamily: T.display, fontSize: 56, color: T.amber, fontWeight: 800,
          lineHeight: 1, letterSpacing: '-0.03em' }}>
          $650<span style={{ fontSize: 28, color: T.ink2 }}>млрд</span>
        </div>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, letterSpacing: 1.5,
          textTransform: 'uppercase', marginTop: 2 }}>капекс ИИ · один 2026 год</div>
      </div>
      <div style={{ flex: '1 1 260px' }}>
        <p style={{ margin: 0, fontSize: 14, color: T.ink2, lineHeight: 1.6 }}>
          Только Amazon, Google, Meta и Microsoft собираются потратить около $650 млрд
          на ИИ-инфраструктуру в 2026 году. Это больше ВВП Израиля, Польши или Украины.
          <b style={{ color: T.ink }}> В одном году.</b>
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.55 }}>
          Когда Google и Microsoft ставят $300 млрд в одну ставку — это уже не «может, взлетит».
          Это системное изменение.
        </p>
      </div>
    </div>
  );
}

// ---------- GENERATIVE vs AGENTIC (C02) ----------
function GenVsAgent({ T }) {
  const genSteps = [
    { t: '1. Запрос', v: '«Напиши письмо клиенту»', n: '1 реплика от юзера' },
    { t: '2. Ответ', v: 'Текст письма', n: '1 реплика от ИИ' },
    { t: '3. Действие', v: 'Копирует, правит, отправляет', n: 'Ручная работа' },
  ];
  const agentSteps = [
    { t: '1. Цель', v: '«Обработай заявку клиента»', n: '1 реплика от юзера' },
    { t: '2. План', v: 'Агент разбивает на 5 шагов', n: 'Автоматически' },
    { t: '3. Контекст', v: 'Читает CRM, историю', n: 'Сам' },
    { t: '4. Действия', v: 'Пишет, отправляет, заносит в CRM', n: 'Сам' },
    { t: '5. Проверка', v: 'Следит за ответом клиента', n: 'Сам' },
  ];
  const Col = ({ header, subtitle, steps, finalV, style, accent }) => (
    <div style={{ flex: 1, minWidth: 0, padding: 20, border: `1px solid ${T.line}`, borderRadius: 6,
      background: style === 'primary' ? `linear-gradient(180deg, ${T.amberSoft}44, ${T.cardA})` : T.cardA,
      borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 10, color: accent, letterSpacing: 2, textTransform: 'uppercase',
        fontFamily: T.mono, fontWeight: 700 }}>{header}</div>
      <div style={{ fontSize: 22, color: T.ink, fontWeight: 700, marginTop: 4, fontFamily: T.display }}>
        {subtitle}
      </div>
      <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ padding: '10px 12px', background: T.paper, border: `1px solid ${T.line}`,
            borderRadius: 4, borderLeft: `2px solid ${accent}` }}>
            <div style={{ fontSize: 10, color: accent, fontFamily: T.mono, letterSpacing: 1,
              textTransform: 'uppercase', fontWeight: 700 }}>{s.t}</div>
            <div style={{ fontSize: 13, color: T.ink, fontWeight: 600, marginTop: 2 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{s.n}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '12px 14px', background: accent,
        borderRadius: 4, color: T.paper }}>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: T.mono, fontWeight: 700, opacity: .8 }}>ИТОГ</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{finalV}</div>
      </div>
    </div>
  );
  return (
    <div style={{ fontFamily: T.body }}>
      <div style={{ padding: '10px 14px', border: `1px solid ${T.line}`, borderRadius: 6,
        background: T.cardB, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Icon name="brain" size={2} />
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>
          Один запрос — два подхода
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5, fontFamily: T.mono }}>C02</span>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
        <Col header="Генеративный ИИ" subtitle="Советник" steps={genSteps}
          finalV="Письмо + 10 мин работы" accent={T.muted} />
        <Col header="Агентный ИИ" subtitle="Сотрудник" steps={agentSteps}
          finalV="Закрытая задача + 0 мин юзера" style="primary" accent={T.amber} />
      </div>
      <div style={{ marginTop: 12, padding: '10px 14px', background: T.tealSoft + '66',
        borderLeft: `3px solid ${T.teal}`, borderRadius: '0 4px 4px 0',
        fontSize: 13.5, color: T.ink2, lineHeight: 1.55 }}>
        Агентный ИИ снимает с тебя не <i>шаг</i>, а <b>всю цепочку</b> — если ты чётко поставил цель.
      </div>
    </div>
  );
}

// ---------- AGENT FLOW (C01) ----------
function AgentFlow({ T }) {
  const nodes = [
    { label: 'ЦЕЛЬ',      sub: '«Напиши письмо»',  style: 'neutral' },
    { label: 'ПЛАН',      sub: 'разбивает на шаги', style: 'neutral' },
    { label: 'ПОИСК',     sub: 'читает CRM',        style: 'neutral' },
    { label: 'ЧЕРНОВИК',  sub: 'пишет текст',       style: 'primary' },
    { label: 'ПРОВЕРКА',  sub: 'тон и ошибки',      style: 'neutral' },
    { label: 'ОТПРАВКА',  sub: 'почта',             style: 'success' },
    { label: 'ЛОГ',       sub: 'записывает в CRM',  style: 'neutral' },
  ];
  const clrFor = (s) => ({ neutral: T.muted, primary: T.amber, success: T.teal }[s] || T.muted);
  const bgFor  = (s) => ({ neutral: T.cardA, primary: T.amberSoft, success: T.tealSoft }[s] || T.cardA);
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 6, background: T.cardA,
      overflow: 'hidden', fontFamily: T.body }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex',
        alignItems: 'center', gap: 10, background: T.cardB }}>
        <Icon name="arrow" size={2} />
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>
          Путь агентного ИИ: от цели до результата
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5, fontFamily: T.mono }}>C01</span>
      </div>
      <div style={{ padding: '20px 16px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 'max-content' }}>
          {nodes.map((n, i) => (
            <React.Fragment key={i}>
              <div style={{
                padding: '10px 14px', minWidth: 120, textAlign: 'center',
                border: `2px solid ${clrFor(n.style)}`, borderRadius: 6,
                background: bgFor(n.style),
                boxShadow: n.style === 'primary' ? `0 0 0 4px ${T.amberSoft}66` : 'none',
              }}>
                <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: 1.5,
                  color: clrFor(n.style), fontWeight: 700 }}>{n.label}</div>
                <div style={{ fontSize: 11, color: T.ink2, marginTop: 3, lineHeight: 1.4 }}>{n.sub}</div>
              </div>
              {i < nodes.length - 1 && (
                <div style={{ width: 24, height: 2, background: T.line2, position: 'relative',
                  margin: '0 2px', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', right: -6, top: -4, width: 0, height: 0,
                    borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
                    borderLeft: `7px solid ${T.line2}` }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: '10px 14px', background: T.cardB,
          borderRadius: 4, fontSize: 12, color: T.muted, fontFamily: T.mono, letterSpacing: .5 }}>
          OSWorld 2025 · успешность агентов на компьютерных задачах: 12% → 66% за год.
          В пределах 6 п.п. от человека.
        </div>
      </div>
    </div>
  );
}

// ---------- INTERACTIVE T01: первый контакт ----------
function FirstContactT01({ T }) {
  const [step, setStep] = React.useState(0);
  const [topic, setTopic] = React.useState('');
  const topics = ['квантовая запутанность', 'двигатель внутреннего сгорания', 'падение Западной Римской империи'];
  const sample = topic || topics[0];
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 6, background: T.cardA,
      overflow: 'hidden', fontFamily: T.body }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex',
        alignItems: 'center', gap: 10, background: T.cardB }}>
        <Icon name="bolt" size={2} />
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>Тренажёр · Первый контакт</div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: T.muted, letterSpacing: 1.5, fontFamily: T.mono }}>T01</span>
      </div>
      {/* steps */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? T.amber : T.line }} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, textTransform: 'uppercase',
          fontFamily: T.mono, fontWeight: 700 }}>
          шаг {step + 1} из 3
        </div>

        {step === 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, marginBottom: 4 }}>
              Выбери тему, в которой ты совсем не эксперт
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 12, lineHeight: 1.55 }}>
              Это важно: если тема знакомая — ты не почувствуешь разницу двух ответов.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {topics.map(t => (
                <button key={t} onClick={() => setTopic(t)} style={{
                  padding: '12px 10px', border: `1px solid ${topic === t ? T.amber : T.line}`,
                  borderRadius: 4, background: topic === t ? T.amberSoft : T.paper, cursor: 'pointer',
                  fontSize: 12.5, color: T.ink, fontFamily: 'inherit', textAlign: 'left' }}>
                  {t}
                </button>
              ))}
            </div>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="или свою тему..."
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, fontFamily: 'inherit',
                border: `1px solid ${T.line2}`, borderRadius: 4, background: T.paper, color: T.ink,
                boxSizing: 'border-box', outline: 'none' }} />
            <button onClick={() => setStep(1)} disabled={!topic}
              style={{ marginTop: 14, padding: '10px 18px', background: topic ? T.amber : T.line,
                color: T.paper, border: 'none', borderRadius: 4, cursor: topic ? 'pointer' : 'not-allowed',
                fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                fontFamily: T.body }}>
              дальше →
            </button>
          </div>
        )}

        {step === 1 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, marginBottom: 4 }}>
              Задание 1: Задай «обычный» вопрос
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 12, lineHeight: 1.55 }}>
              Напиши модели так, как спросил бы друга. Не думай про «правильный промпт».
            </div>
            <div style={{ padding: '14px 16px', background: T.codeBg, borderRadius: 4,
              fontFamily: T.mono, fontSize: 13, color: T.codeFg, lineHeight: 1.7 }}>
              <span style={{ color: T.muted }}>&gt; </span>
              Расскажи про <b>{sample}</b>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <a href="#" style={{ padding: '8px 14px', border: `1px solid ${T.line2}`, borderRadius: 4,
                color: T.ink2, textDecoration: 'none', fontSize: 12, fontFamily: T.body,
                display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                ↗ открыть в ChatGPT
              </a>
              <a href="#" style={{ padding: '8px 14px', border: `1px solid ${T.line2}`, borderRadius: 4,
                color: T.ink2, textDecoration: 'none', fontSize: 12, fontFamily: T.body,
                display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                ↗ открыть в Claude
              </a>
              <span style={{ flex: 1 }} />
              <button onClick={() => setStep(2)} style={{
                padding: '10px 18px', background: T.amber, color: T.paper, border: 'none',
                borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase', fontFamily: T.body }}>
                получил ответ →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, marginBottom: 4 }}>
              Задание 2: Тот же вопрос — иначе
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 12, lineHeight: 1.55 }}>
              Попроси объяснить это <b>как 7-летнему</b>. Сравни два ответа.
            </div>
            <div style={{ padding: '14px 16px', background: T.codeBg, borderRadius: 4,
              fontFamily: T.mono, fontSize: 13, color: T.codeFg, lineHeight: 1.7 }}>
              <span style={{ color: T.muted }}>&gt; </span>
              Объясни <b>{sample}</b> как 7-летнему ребёнку. Без терминов. 3 абзаца.
            </div>
            <Callout kind="tip" title="Почувствуй разницу" T={T}>
              Не читай об ИИ — почувствуй. Разница между этими двумя ответами и есть главный навык
              ИИ-эпохи: уметь переформулировать.
            </Callout>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => setStep(0)} style={{
                padding: '8px 14px', background: 'transparent', color: T.muted,
                border: `1px solid ${T.line2}`, borderRadius: 4, cursor: 'pointer', fontSize: 12,
                fontFamily: T.body }}>
                ← начать заново
              </button>
              <span style={{ flex: 1 }} />
              <button style={{
                padding: '10px 18px', background: T.teal, color: T.paper, border: 'none',
                borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase', fontFamily: T.body }}>
                ✓ готово
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- MAIN LESSON ----------
function VariantD() {
  const { dark, setDark, T } = useCourseTheme();
  return (
    <div style={{ width: '100%', minHeight: 5100, background: T.bg, color: T.ink,
      fontFamily: T.body, position: 'relative' }}>
      <CourseTopBar dark={dark} setDark={setDark} T={T} />

      <div style={{ display: 'flex', alignItems: 'flex-start', maxWidth: 1400, marginInline: 'auto' }}>
        <CourseSidebar T={T} />

        {/* MAIN */}
        <main style={{ flex: 1, padding: '28px 40px 80px', maxWidth: 820, minWidth: 0 }}>
          <LessonHeader T={T} />

          {/* saммari + audio */}
          <SummaryBlock T={T} />
          <AudioBlock T={T} />

          {/* 1. Хук */}
          <H2 icon="bulb" num="01" T={T}>Самый неудобный факт про ИИ</H2>
          <HookBlock T={T} />

          {/* 2. Суть */}
          <H2 icon="brain" num="02" T={T}>Что модель делает на самом деле</H2>

          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: T.ink2, fontFamily: T.body, margin: '14px 0' }}>
            <b style={{ color: T.ink }}>Токен</b> — это кусочек слова. В среднем одно английское слово = 1 токен,
            русское = 2 токена (русский «дороже» для моделей). Слово «непредсказуемость» — это 3–4 токена.
          </p>

          <Callout kind="info" title="Ключевая идея" T={T}>
            Модель не «читает» твой запрос так, как читаем мы. Она превращает его в последовательность токенов
            и начинает по одному достраивать ответ: <i>какой токен статистически вероятнее всего следующим</i>.
          </Callout>

          <ChatRevealBlock T={T}
            prompt="Хочешь проверить, как одна формулировка меняет всё?"
            userSays="Да, покажи на живом примере"
          >
            <p style={{ margin: 0 }}>
              Отлично. Давай договоримся: ты <b>не тестируешь память</b> модели. Ты запускаешь её
              по разным траекториям в пространстве токенов.
            </p>
            <p style={{ marginTop: 10, marginBottom: 0 }}>
              Один и тот же вопрос — три формулировки. Смотри, как меняется ответ (и почему это
              свойство, а не баг):
            </p>
          </ChatRevealBlock>

          <ThreeFormulations T={T} />

          <H2 icon="target" num="03" T={T}>Три следствия, которые меняют всё</H2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, margin: '10px 0 18px' }}>
            <Corollary n={1} color={T.amber} T={T}
              title="ИИ мыслит контекстом, а не памятью"
              body={<>Всё, что есть у модели в момент ответа — это твой текст (и системная инструкция).
                Если ты не написал, что ты маркетолог и пишешь для IT-аудитории — модель не знает.
                Она ответит <i>усреднённому</i> пользователю.</>}
            />
            <Corollary n={2} color={T.magenta} T={T}
              title="Уверенность ≠ правота"
              body={<>Модель всегда выбирает самый вероятный следующий токен. Если в обучающем корпусе было
                много уверенных утверждений о несуществующем факте — модель выдаст этот факт с той же
                уверенностью, с какой выдаёт правду.</>}
            />
            <Corollary n={3} color={T.teal} T={T}
              title="Формулировка меняет ответ сильнее, чем кажется"
              body={<>«Что такое Agile» и «объясни Agile на примере бригады строителей прорабу без IT»
                — это не один вопрос разными словами. Это <b>разные траектории</b>.</>}
            />
          </div>

          <ImagePlaceholder T={T}
            prompt='Пиксельная иллюстрация: облако из токенов ("не","знаю","как","думает","модель") собирается в силуэт мозга. Цвета: amber #E08000 и teal #2A8F85. Квадратные пиксели, 128×128, прозрачный фон.'
          />

          <H2 icon="book" num="04" T={T}>Что ИИ делает и чего не делает</H2>
          <p style={{ fontSize: 14, color: T.ink2, margin: '0 0 12px', lineHeight: 1.6 }}>
            Короткая памятка — её ты забираешь в свой «рюкзак».
          </p>
          <ComparisonTable T={T} />

          <Callout kind="quote" T={T} title="Главное правило">
            Модель ничего не знает. Она знает только то, что ты <b>положил в контекст</b> +
            то, что есть в её весах.
          </Callout>

          {/* 5. Кейс */}
          <H2 icon="chat" num="05" T={T}>Кейс: три формулировки про стратегию «Альпины»</H2>
          <div style={{ padding: '18px 20px', background: T.cardB, border: `1px solid ${T.line}`,
            borderRadius: 6, fontFamily: T.body }}>
            <div style={{ fontSize: 10, color: T.magenta, letterSpacing: 2, textTransform: 'uppercase',
              fontFamily: T.mono, fontWeight: 700, marginBottom: 10 }}>◈ кейс от автора</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 13 }}>
              {[
                { t: 'расплывчатая', r: 'общие советы уровня «публикуйте полезный контент»', s: 2 },
                { t: 'с брендом', r: 'узнаваемые отсылки, но всё ещё шаблон', s: 3 },
                { t: 'с данными', r: 'конкретные идеи, от которых можно отталкиваться', s: 5 },
              ].map((c, i) => (
                <div key={i} style={{ padding: '12px', background: T.paper, borderRadius: 4,
                  border: `1px solid ${T.line}` }}>
                  <div style={{ fontSize: 10, color: T.amber, fontFamily: T.mono, letterSpacing: 1.5,
                    textTransform: 'uppercase', marginBottom: 6 }}>вариант {i + 1} · {c.t}</div>
                  <div style={{ color: T.ink2, lineHeight: 1.55, fontSize: 12.5, marginBottom: 8 }}>{c.r}</div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} style={{ width: 8, height: 8,
                        background: n <= c.s ? T.amber : T.line, borderRadius: 1 }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Артефакт */}
          <H2 icon="flag" num="06" T={T}>Артефакт урока</H2>
          <ArtifactBlock T={T} />

          {/* 7. Проверка */}
          <H2 icon="check" num="07" T={T}>Микро-задание на сегодня</H2>
          <Callout kind="tip" T={T} title="1 минута">
            Возьми задачу, с которой ты сегодня реально работал (письмо, отчёт, объяснение кому-то).
            Напиши <b>две формулировки</b> запроса: одну как написал бы раньше, и одну — с ролью,
            аудиторией и форматом. Не запускай — просто почувствуй разницу.
          </Callout>

          {/* 8. Под капотом */}
          <DeepDive T={T} />

          {/* 9. Навигация */}
          <LessonNav T={T} />

          {/* 10. Связанные уроки */}
          <RelatedBlock T={T} />

          {/* 11. Источники */}
          <SourcesBlock T={T} />

          {/* 12. Обсуждение */}
          <DiscussionBlock T={T} />

          {/* 13. Футер */}
          <LessonFooter T={T} />
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { Lesson01: VariantD });

})();
