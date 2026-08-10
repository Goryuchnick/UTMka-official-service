// variantC.jsx — Лендинг БЕСПЛАТНОГО курса «ИИ — твой экзоскелет»
// 4 недели, 4 модуля, доступ через Telegram-подписку.

const C_MODULES = [
  { n: '00', title: 'Зачем и почему сейчас', lessons: 2,
    artifact: 'Твоя «точка А»: что умею, куда иду',
    items: ['Масштаб изменений — без паники','Как не отстать от темпа'] },
  { n: '01', title: 'Язык ИИ', lessons: 4,
    artifact: 'Свой prompt-бук (5–7 промптов)',
    items: ['Как ИИ «думает» на самом деле','Анатомия хорошего промпта','Продвинутые техники','Галлюцинации и фактчекинг'] },
  { n: '02', title: 'Поиск и разбор', lessons: 3,
    artifact: 'Разобранный документ за 20 минут + свой NotebookLM',
    items: ['Perplexity вместо Google','NotebookLM как второй мозг','Research-pipeline'] },
  { n: '03', title: 'Создание', lessons: 4,
    artifact: 'Мини-портфель: пост + обложка + подкаст/видео',
    items: ['Текст','Картинки','Звук','Видео'] },
  { n: '04', title: 'Свой помощник', lessons: 4,
    artifact: 'Работающий ассистент + знакомство с Cursor/Claude Code',
    items: ['Custom GPTs','Агенты и автоматизация','Cursor и Claude Code','Как учиться дальше'] },
];

const C_PAINS = [
  ['Часами роетесь в Google', 'через рекламу и SEO-мусор'],
  ['Смотрите в пустой экран', 'по 40 минут над письмом или постом'],
  ['Считаете таблицы руками', 'когда всё это уже может делать ИИ'],
  ['Думаете, ChatGPT тупой', 'потому что он выдал банальность'],
];

const C_FAQ = [
  ['Правда бесплатно? В чём подвох?',
    'Полностью бесплатно. Единственное условие — подписка на Telegram-канал, где я выкладываю обновления курса: ИИ меняется каждый месяц, старые уроки быстро устаревают.'],
  ['Нужно ли уметь программировать?',
    'Нет. Кода в курсе нет. В последнем модуле смотрим Cursor и Claude Code как пользователи, не как разработчики.'],
  ['Сколько реально займёт времени?',
    'Темп рекомендован 3–4 урока в неделю, полный курс ~4 недели. Но можно за выходные: пройти всё за 2 дня — реально.'],
  ['А если я уже давно пользуюсь ChatGPT?',
    'В диагностике на входе скажешь, что знаешь — курс подстроится и пропустит очевидное. А «Под капотом» откроет то, что даже опытные пользователи обычно не знают.'],
  ['Что с возвратом?',
    'Курс бесплатный, возвращать нечего. Если не зашло — отписывайся от канала и возвращайся, когда появится время.'],
  ['Нужен ли VPN?',
    'Большинство инструментов работают из России напрямую или через простые обходы. Каждый инструмент снабжён пометкой о доступности.'],
];

function TerminalDemo() {
  const [job, setJob] = React.useState('маркетолог');
  const [answer, setAnswer] = React.useState(null);
  const [typing, setTyping] = React.useState(false);
  const CANNED = {
    'маркетолог': [
      'анализ 300+ отзывов клиентов → инсайты за 5 мин',
      'генерация 50 вариантов заголовков → выбор через A/B',
      'еженедельный отчёт → собирается n8n-потоком сам',
      'brief от заказчика → структурированное ТЗ за 2 мин',
    ],
    'учитель': [
      'адаптация материала под 3 уровня учеников одновременно',
      'автоматическая проверка эссе по 8 критериям',
      'персональные карточки-задания из учебника',
      'отчёт родителям — в одном сообщении',
    ],
    'бухгалтер': [
      'проверка первички через OCR → ошибки подсвечены',
      'сведение двух актов → протокол разногласий сам',
      'чат-бот для типовых вопросов коллег',
      'перевод ФЗ-поправок на человеческий язык',
    ],
    'default': [
      'рутинные задачи, которые съедают 2-3 часа в день',
      'написание писем и документов в вашем стиле',
      'быстрый разбор сложной темы или документа',
      'свой помощник под твою конкретную работу',
    ],
  };
  const run = () => {
    setTyping(true); setAnswer(null);
    setTimeout(() => {
      const k = Object.keys(CANNED).find(k => job.toLowerCase().includes(k)) || 'default';
      setAnswer(CANNED[k]); setTyping(false);
    }, 900);
  };
  return (
    <div style={{ border: `2px solid ${TOKENS.primary}`, borderRadius: 6, background: '#060604', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        background: 'linear-gradient(180deg, #242420, #1e1e1a)', borderBottom: `1px solid ${TOKENS.border}` }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: TOKENS.destructive }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: TOKENS.primaryDim }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: TOKENS.success }} />
        <span style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 2, marginLeft: 10, textTransform: 'uppercase' }}>
          /курс/демо — покажи, что ИИ изменит в моей работе
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: TOKENS.success }}>● online</span>
      </div>
      <div style={{ padding: '18px 20px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.18) 2px 4px)',
          pointerEvents: 'none' }} />
        <div style={{ position: 'relative', fontSize: 13 }}>
          <div>
            <span style={{ color: TOKENS.info }}>visitor</span>
            <span style={{ color: TOKENS.muted }}>@pronin</span>
            <span style={{ color: TOKENS.fg }}>:~$ </span>
            <span style={{ color: TOKENS.primary }}>demo --profession=</span>
            <input value={job} onChange={e => setJob(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') run(); }}
              style={{ background: 'transparent', border: 'none', outline: 'none',
                color: TOKENS.info, fontFamily: TOKENS.mono, fontSize: 13,
                borderBottom: `1px dashed ${TOKENS.primaryDim}`, minWidth: 180, padding: '0 4px' }} />
          </div>
          <button onClick={run} style={{ marginTop: 10, padding: '6px 14px',
            background: TOKENS.primary, color: TOKENS.bg, fontFamily: TOKENS.mono,
            fontSize: 12, border: 'none', cursor: 'pointer', letterSpacing: 1.5, fontWeight: 700 }}>› run</button>
          {typing && <div style={{ marginTop: 14, color: TOKENS.primaryDim, fontSize: 12 }}>parsing...<span className="pr-cursor" /></div>}
          {answer && (
            <div key={answer.join('|')} style={{ marginTop: 14, animation: 'pr-riseIn .4s ease-out' }}>
              <div style={{ fontSize: 11, color: TOKENS.success, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                ✓ RESPONSE · saved 10h/week
              </div>
              {answer.map((line, i) => (
                <div key={i} style={{ fontSize: 13, color: TOKENS.fg, padding: '4px 0',
                  animation: `pr-riseIn .4s ease-out ${i * 0.1}s both`, lineHeight: 1.5 }}>
                  <span style={{ color: TOKENS.primary }}>›</span> {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CourseHero() {
  return (
    <div style={{ position: 'relative', padding: '32px 30px',
      border: `2px solid ${TOKENS.primary}`, borderRadius: 8,
      background: `linear-gradient(180deg, rgba(255,176,0,.08), transparent 70%), ${TOKENS.card}`,
      overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40,
        background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.18) 2px 4px)',
        pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span className="pr-tag pr-tag--mag" style={{ animation: 'pr-blink 1.4s step-end infinite' }}>▶ FREE · 100%</span>
        <span className="pr-tag pr-tag--hi">4 НЕДЕЛИ</span>
        <span className="pr-tag">16 УРОКОВ</span>
        <span className="pr-tag pr-tag--info">БЕЗ КОДА</span>
        <span className="pr-tag" style={{ marginLeft: 'auto', color: TOKENS.success, borderColor: TOKENS.success }}>
          <span className="pr-ledDot" style={{ marginRight: 6 }} /> ПОТОК АКТИВЕН
        </span>
      </div>
      <div style={{ fontSize: 11, color: TOKENS.primaryDim, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>
        бесплатный.практический.курс
      </div>
      <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.04, color: TOKENS.primary, fontWeight: 700, letterSpacing: -.5,
        textShadow: '0 0 18px rgba(255,176,0,.22)' }}>
        Нейросети для тех,<br/>кто думает, что это «<span style={{ color: TOKENS.info }}>просто игрушка</span>».
      </h1>
      <p style={{ maxWidth: 660, margin: '20px 0 8px', fontSize: 15.5, lineHeight: 1.55, color: TOKENS.fg, opacity: .92 }}>
        С нуля до своего ИИ-помощника для работы, учёбы и быта. Без воды и программирования.{' '}
        <span style={{ color: TOKENS.primary }}>ИИ — это твой личный экзоскелет:</span> учит тебя, считает за тебя, пишет с тобой.
      </p>
      <p style={{ maxWidth: 660, margin: 0, fontSize: 13, color: TOKENS.muted }}>
        Обещание: за 4 недели перестанешь отставать. Не «станешь экспертом» — <i>станешь независимее</i>.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 22 }}>
        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '13px 22px',
          background: TOKENS.primary, color: TOKENS.bg, textDecoration: 'none',
          fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase',
          borderRadius: 2, boxShadow: '0 0 18px rgba(255,176,0,.3)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
          войти через telegram
        </a>
        <a href="#program" className="pr-chip">↓ посмотреть программу</a>
        <span style={{ fontSize: 11, color: TOKENS.subtle, marginLeft: 'auto', maxWidth: 220, lineHeight: 1.4 }}>
          доступ через подписку на @alex_pronin — там обновления курса
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 26 }}>
        {[['4','модуля + вводный'],['16','уроков · 15-25 мин'],['10+','тренажёров'],['∞','артефактов в рюкзаке']].map(([n, l]) => (
          <div key={l} style={{ padding: '12px 14px', border: `1px solid ${TOKENS.border}`, borderRadius: 4, background: TOKENS.bg }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: TOKENS.primary, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
            <div style={{ fontSize: 10, color: TOKENS.subtle, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoursePains() {
  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 6 }}>
        <span className="pr-prompt">cat /etc/боль.log</span>
      </div>
      <h2 style={{ margin: '0 0 20px', fontSize: 26, color: TOKENS.fg, fontWeight: 600 }}>
        Вы <span style={{ color: TOKENS.primary }}>всё ещё</span> делаете это руками?
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {C_PAINS.map(([title, sub], i) => (
          <div key={i} style={{ padding: '16px 18px', border: `1px solid ${TOKENS.border}`,
            borderRadius: 6, background: TOKENS.card }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 22, color: TOKENS.primaryDim, lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div style={{ fontSize: 14, color: TOKENS.fg, fontWeight: 600 }}>{title}</div>
                <div style={{ fontSize: 12, color: TOKENS.muted, marginTop: 2 }}>{sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CourseDemoSection() {
  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 6 }}>
        <span className="pr-prompt">./демо --покажи_как_работает</span>
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 26, color: TOKENS.fg, fontWeight: 600 }}>
        Введи свою профессию — ИИ покажет, что он умеет <span style={{ color: TOKENS.primary }}>прямо сейчас</span>.
      </h2>
      <p style={{ fontSize: 13.5, color: TOKENS.muted, margin: '0 0 16px', maxWidth: 640 }}>
        Это тот самый тренажёр из Урока 0. В курсе таких — десятки.
      </p>
      <TerminalDemo />
    </div>
  );
}

function CourseProgram() {
  const [open, setOpen] = React.useState(1);
  return (
    <div id="program" style={{ marginTop: 48 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 6 }}>
        <span className="pr-prompt">tree ./курс --depth=2</span>
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 26, color: TOKENS.fg, fontWeight: 600 }}>
        4 модуля + вводный. <span style={{ color: TOKENS.primary }}>16 уроков.</span>
      </h2>
      <p style={{ fontSize: 13.5, color: TOKENS.muted, margin: '0 0 20px', maxWidth: 620 }}>
        Каждый модуль — один артефакт. Реальная штука, которая остаётся у тебя после курса.
      </p>
      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card, overflow: 'hidden' }}>
        {C_MODULES.map((m, i) => {
          const isOpen = open === i;
          return (
            <div key={m.n} style={{ borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.border}` }}>
              <button onClick={() => setOpen(isOpen ? -1 : i)} style={{
                display: 'grid', gridTemplateColumns: '70px 1fr auto auto', alignItems: 'center', gap: 16,
                width: '100%', padding: '14px 18px', background: 'transparent', border: 'none',
                cursor: 'pointer', color: TOKENS.fg, fontFamily: 'inherit', textAlign: 'left' }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: isOpen ? TOKENS.primary : TOKENS.primaryDim,
                  fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>M{m.n}</span>
                <div>
                  <div style={{ fontSize: 15, color: TOKENS.fg, fontWeight: 600 }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: TOKENS.muted, marginTop: 2 }}>
                    <span style={{ color: TOKENS.info }}>◆ артефакт:</span> {m.artifact}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 1.5 }}>{m.lessons} УР.</span>
                <span style={{ color: TOKENS.primary, fontSize: 16, width: 16,
                  transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform .25s' }}>+</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 18px 18px 88px', animation: 'pr-riseIn .25s ease-out' }}>
                  {m.items.map((it, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                      fontSize: 13, color: TOKENS.fg, borderTop: j === 0 ? `1px dashed ${TOKENS.border}` : 'none' }}>
                      <span style={{ fontSize: 9, color: TOKENS.primaryDim, letterSpacing: 1,
                        width: 36, fontVariantNumeric: 'tabular-nums' }}>{m.n}.{j + 1}</span>
                      <span style={{ flex: 1 }}>{it}</span>
                      <span style={{ fontSize: 10, color: TOKENS.subtle }}>~18 мин</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CourseModes() {
  const modes = [
    { code: 'A', name: 'Путь', sub: 'основной', desc: 'Последовательно: 0 → 1 → 2 → 3 → 4. Для тех, кто любит дисциплину.' },
    { code: 'B', name: 'Задача', sub: 'адаптивный', desc: 'Выбираешь боль — ИИ собирает маршрут из 3–5 уроков из разных модулей.' },
    { code: 'C', name: 'Канал', sub: 'компаньон', desc: 'Telegram-бот раз в день присылает мысль + 5-минутную практику.' },
  ];
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 6 }}>
        <span className="pr-prompt">select --mode</span>
      </div>
      <h2 style={{ margin: '0 0 20px', fontSize: 26, color: TOKENS.fg, fontWeight: 600 }}>
        Три режима прохождения — <span style={{ color: TOKENS.primary }}>можно переключать</span>.
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {modes.map(m => (
          <div key={m.code} style={{ padding: '18px 18px', border: `1px solid ${TOKENS.border}`,
            borderRadius: 6, background: TOKENS.card }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 30, height: 30, border: `2px solid ${TOKENS.primary}`, borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: TOKENS.primary, background: TOKENS.bg }}>{m.code}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.fg }}>{m.name}</div>
                <div style={{ fontSize: 10, color: TOKENS.subtle, letterSpacing: 1.5, textTransform: 'uppercase' }}>{m.sub}</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: TOKENS.muted, lineHeight: 1.55, margin: 0 }}>{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CourseWhyFree() {
  return (
    <div style={{ marginTop: 48, padding: '22px 24px', border: `1px dashed ${TOKENS.primaryDim}`, borderRadius: 6,
      background: `linear-gradient(180deg, rgba(91,227,212,.04), transparent 70%), ${TOKENS.card}` }}>
      <div style={{ fontSize: 10, color: TOKENS.info, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
        // почему курс бесплатный
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: TOKENS.fg, opacity: .9, margin: 0, maxWidth: 720 }}>
        Мне интереснее сделать 10 000 человек автономнее, чем 100 — богаче. Курс — моё портфолио как
        AI-интегратора: если зайдёт — приходите работать со мной над вашим продуктом. Не зайдёт —
        всё равно уйдёте с рабочим ассистентом. Это <b style={{ color: TOKENS.primary }}>win-win</b>, а не воронка.
      </p>
    </div>
  );
}

function CourseGamification() {
  const feats = [
    { icon: '▶', t: 'Тренажёры вместо квизов', d: 'Введи промпт — получи API-ответ. Работает — значит урок пройден.' },
    { icon: '◆', t: 'Артефакты, а не знания', d: 'Каждый модуль = одна осязаемая вещь в «рюкзаке».' },
    { icon: '●', t: 'Пасхалки и ключи', d: 'Пароли к бонусным урокам спрятаны в тексте и картинках.' },
    { icon: '✦', t: 'Видимый финиш', d: 'Всегда знаешь, сколько осталось — в минутах, не абстрактно.' },
    { icon: '◉', t: 'Пауза без потери', d: 'Не заходил неделю — бот напомнит, прогресс не сбросится.' },
    { icon: '▲', t: 'Двойной слой', d: '15 минут «основное» + 10 минут «под капотом» — сам выбираешь глубину.' },
  ];
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 6 }}>
        <span className="pr-prompt">features --ui</span>
      </div>
      <h2 style={{ margin: '0 0 20px', fontSize: 26, color: TOKENS.fg, fontWeight: 600 }}>
        Что внутри, кроме уроков
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {feats.map((f, i) => (
          <div key={i} style={{ padding: '14px 16px', border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card }}>
            <div style={{ fontSize: 16, color: TOKENS.primary, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontSize: 13, color: TOKENS.fg, fontWeight: 600, marginBottom: 4 }}>{f.t}</div>
            <div style={{ fontSize: 12, color: TOKENS.muted, lineHeight: 1.5 }}>{f.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CourseHow() {
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 6 }}>
        <span className="pr-prompt">./start --free</span>
      </div>
      <h2 style={{ margin: '0 0 20px', fontSize: 26, color: TOKENS.fg, fontWeight: 600 }}>
        Как получить доступ <span style={{ color: TOKENS.primary }}>за 30 секунд</span>.
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { n: '01', t: 'Войти через Telegram', d: 'Никакой регистрации. Клик — и ты в личном кабинете.' },
          { n: '02', t: 'Подписаться на канал', d: 'Там обновления курса: ИИ меняется каждый месяц.' },
          { n: '03', t: 'Начать с диагностики', d: '4 вопроса, 2 минуты — ИИ соберёт персональную карту курса.' },
        ].map(step => (
          <div key={step.n} style={{ padding: '18px 18px', border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: TOKENS.primary, lineHeight: 1,
              textShadow: '0 0 10px rgba(255,176,0,.2)' }}>{step.n}</div>
            <div style={{ fontSize: 14, color: TOKENS.fg, fontWeight: 600, margin: '8px 0 6px' }}>{step.t}</div>
            <p style={{ fontSize: 12.5, color: TOKENS.muted, lineHeight: 1.55, margin: 0 }}>{step.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CourseTeacher() {
  return (
    <div style={{ marginTop: 48, padding: '20px 22px', border: `1px solid ${TOKENS.border}`,
      borderRadius: 6, background: TOKENS.card, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 20 }}>
      <div style={{ width: 96, height: 96, border: `2px solid ${TOKENS.primary}`, borderRadius: 4,
        background: TOKENS.bg, display: 'grid', gridTemplateColumns: 'repeat(8, 12px)', gridTemplateRows: 'repeat(8, 12px)' }}>
        {Array.from({ length: 64 }).map((_, i) => {
          const r = Math.floor(i / 8), c = i % 8;
          let col = 'transparent';
          if (r === 1 && c >= 1 && c <= 6) col = TOKENS.primaryDim;
          else if (r >= 2 && r <= 5 && c >= 1 && c <= 6) col = '#c9a574';
          else if (r === 6 && c >= 2 && c <= 5) col = '#c9a574';
          if (r === 3 && (c === 2 || c === 5)) col = TOKENS.bg;
          if (r === 5 && c >= 3 && c <= 4) col = TOKENS.bg;
          return <div key={i} style={{ background: col }} />;
        })}
      </div>
      <div>
        <div style={{ fontSize: 10, color: TOKENS.primaryDim, letterSpacing: 2, textTransform: 'uppercase' }}>КУРС ВЕДЁТ</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: TOKENS.fg, marginTop: 4 }}>Александр Пронин</div>
        <div style={{ fontSize: 12, color: TOKENS.muted, marginTop: 2 }}>
          14 лет в маркетинге · PMM · AI-интегратор · автор AlpinaGPT
        </div>
        <p style={{ fontSize: 13, color: TOKENS.fg, opacity: .88, lineHeight: 1.6, marginTop: 12, maxWidth: 620 }}>
          Я не «коуч по ИИ». Продакт-маркетолог, который последние 3 года вшивает LLM в живые бизнесы —
          от образовательных франшиз до издательства «Альпина». Курс — это то, что я бы объяснил другу за кофе.
        </p>
      </div>
    </div>
  );
}

function CourseFAQ() {
  const [open, setOpen] = React.useState(0);
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ fontSize: 13, color: TOKENS.muted, marginBottom: 12 }}>
        <span className="pr-prompt">cat /etc/faq</span>
      </div>
      <div style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 6, background: TOKENS.card, overflow: 'hidden' }}>
        {C_FAQ.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <div key={i} style={{ borderTop: i === 0 ? 'none' : `1px dashed ${TOKENS.border}` }}>
              <button onClick={() => setOpen(isOpen ? -1 : i)} style={{
                display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
                color: TOKENS.fg, fontSize: 13.5, fontFamily: 'inherit', textAlign: 'left' }}>
                <span>{q}</span>
                <span style={{ color: TOKENS.primary, fontSize: 14,
                  transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform .25s' }}>+</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 18px 16px', fontSize: 12.5, color: TOKENS.muted, lineHeight: 1.6,
                  animation: 'pr-riseIn .25s ease-out', maxWidth: 720 }}>{a}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CourseFinalCTA() {
  return (
    <div style={{ marginTop: 48, padding: '32px 28px', border: `2px solid ${TOKENS.primary}`, borderRadius: 8,
      background: `radial-gradient(ellipse at top, rgba(255,176,0,.12), transparent 70%), ${TOKENS.card}`,
      textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 20, top: 20, display: 'flex', gap: 6, opacity: .8 }}>
        <PixelPacman size={2} />
        <PixelGhost size={2} color={TOKENS.magenta} />
      </div>
      <div style={{ position: 'absolute', right: 20, top: 20, display: 'flex', gap: 6, opacity: .8 }}>
        <PixelGhost size={2} color={TOKENS.info} />
        <PixelGhost size={2} color={TOKENS.success} />
      </div>
      <div style={{ fontSize: 11, color: TOKENS.magenta, letterSpacing: 3, textTransform: 'uppercase',
        animation: 'pr-blink 1.2s step-end infinite', marginBottom: 16 }}>▶ PRESS START</div>
      <h2 style={{ margin: 0, fontSize: 30, color: TOKENS.primary, fontWeight: 700, maxWidth: 680, marginInline: 'auto', lineHeight: 1.15 }}>
        ИИ не заменит людей.<br/>Людей заменят те, кто <span style={{ color: TOKENS.info }}>использует ИИ</span>.
      </h2>
      <p style={{ fontSize: 14, color: TOKENS.fg, opacity: .85, marginTop: 14, maxWidth: 600, marginInline: 'auto' }}>
        Курс бесплатный. 4 недели. Свой ИИ-помощник на выходе.
      </p>
      <div style={{ display: 'inline-flex', gap: 10, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="#" style={{ padding: '14px 28px', background: TOKENS.primary, color: TOKENS.bg,
          textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase',
          borderRadius: 2, boxShadow: '0 0 20px rgba(255,176,0,.35)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
          получить доступ через telegram
        </a>
      </div>
      <div style={{ fontSize: 11, color: TOKENS.subtle, marginTop: 14, letterSpacing: 1.5 }}>
        ~30 секунд до первого урока · никаких регистраций
      </div>
    </div>
  );
}

function CourseNav() {
  const [dark, setDark] = React.useState(true);
  // Точная копия меню из варианта D, но на тёмной amber-палитре (TOKENS)
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20,
      background: TOKENS.bg + 'EE', backdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${TOKENS.border}`, padding: '12px 22px',
      display: 'flex', alignItems: 'center', gap: 14,
      fontFamily: "'Inter',system-ui,sans-serif", marginBottom: 22,
      marginLeft: -24, marginRight: -24, marginTop: -20 }}>
      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
        color: TOKENS.fg, fontFamily: TOKENS.mono, fontSize: 13, fontWeight: 600 }}>
        <span style={{ color: TOKENS.primary }}>❯</span> курс.ии
      </a>
      <span style={{ color: TOKENS.border2, fontSize: 12 }}>/</span>
      <nav style={{ display: 'flex', gap: 2, fontSize: 13 }}>
        {[
          { t: 'к курсам', href: '#' },
          { t: 'к модулям', href: '#' },
          { t: 'выйти', href: '#' },
        ].map(l => (
          <a key={l.t} href={l.href} style={{ padding: '6px 12px', color: TOKENS.muted, textDecoration: 'none',
            borderRadius: 4, transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = TOKENS.fg; e.currentTarget.style.background = TOKENS.card; }}
            onMouseLeave={e => { e.currentTarget.style.color = TOKENS.muted; e.currentTarget.style.background = 'transparent'; }}>{l.t}</a>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <button style={{ padding: '5px 10px', background: 'transparent', border: `1px solid ${TOKENS.border}`,
        borderRadius: 4, color: TOKENS.muted, fontFamily: TOKENS.mono, fontSize: 11, letterSpacing: 1.5,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        RU <span style={{ opacity: .4 }}>/ EN</span>
      </button>
      <button onClick={() => setDark(!dark)} style={{
        width: 46, height: 24, borderRadius: 999, border: `1px solid ${TOKENS.border2}`,
        background: dark ? TOKENS.card : '#FFE3A8', position: 'relative', cursor: 'pointer',
        padding: 0, transition: 'all .25s' }}>
        <span style={{
          position: 'absolute', top: 1, left: dark ? 22 : 1, width: 20, height: 20, borderRadius: '50%',
          background: dark ? TOKENS.primary : TOKENS.bg, transition: 'all .25s cubic-bezier(.4,.8,.2,1.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
          color: dark ? TOKENS.bg : TOKENS.primary,
          boxShadow: '0 1px 3px rgba(0,0,0,.4)',
        }}>{dark ? '☾' : '☀'}</span>
      </button>
    </header>
  );
}

function VariantC() {
  return (
    <div className="pr-root" style={{ width: '100%', minHeight: 2200, padding: '20px 24px 40px' }}>
      <div className="pr-gridBg" style={{ position: 'absolute', inset: 0, opacity: .7 }} />
      <div className="pr-noisebg" />
      <CourseNav />
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 1000, marginInline: 'auto' }}>
        <CourseHero />
        <Divider label="узнай себя" />
        <CoursePains />
        <Divider label="демо" />
        <CourseDemoSection />
        <Divider label="что внутри" />
        <CourseProgram />
        <Divider label="как проходить" />
        <CourseModes />
        <Divider label="почему" />
        <CourseWhyFree />
        <Divider label="фишки" />
        <CourseGamification />
        <Divider label="как начать" />
        <CourseHow />
        <Divider label="автор" />
        <CourseTeacher />
        <Divider label="faq" />
        <CourseFAQ />
        <CourseFinalCTA />
      </div>
      <CRTOverlay sweep />
    </div>
  );
}

Object.assign(window, { VariantC });
