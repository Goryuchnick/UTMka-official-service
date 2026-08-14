# UTMka 3.0 — ШАГ 7: десктоп на Tauri. Инженерный план

> **Статус: исполнен 2026-08-13.** Этапы 1–10 пройдены, открытые вопросы §8
> закрыты решениями владельца и записаны в [ARCHITECTURE.md](ARCHITECTURE.md) §11.
> Что делать руками при выпуске — [DESKTOP-BUILD.md](DESKTOP-BUILD.md).
>
> Чего в плане не было и что выяснилось по ходу (подробности — в журнале решений):
> `lower()` в SQLite не понижает кириллицу, поэтому уникальность имени шаблона
> держит колонка `name_key`; `color-mix(…, transparent)` в WebView2 теряет
> прозрачность и заливает экран CRT-слоем; `journal_mode` в инициализаторе пула
> даёт `database is locked` на старте; Turbopack не принимает абсолютные
> Windows-пути в `resolveAlias`; `useSearchParams` в рамке устройства роняет
> пререндер 404. Плюс найден живой баг веба: отчёт об импорте затирался
> перечитыванием списка, и «загружено 8 из 13» пользователь не видел никогда.
>
> **Исходный план ниже оставлен без правок** — он документирует, что и почему
> решалось до реализации.

> **Статус:** план, на согласование. 2026-08-12.
> Сведён из пяти разведок по живому коду: интерфейс, серверный слой, хранилище, тулчейн Tauri, ядро.
> Решения из [ARCHITECTURE.md](ARCHITECTURE.md) не пересматриваются: ядро — чистый TS без сети,
> DOM и зависимостей; десктоп — `apps/desktop` на Tauri с локальным SQLite; LLM в десктопе нет;
> дизайн-система наследуется от «ПРОНИН-ОС»; интерфейс только русский.
> Всё, что этот план решает нового, уезжает в журнал решений ARCHITECTURE §11 по мере исполнения.

---

## 0. Сводка решений

| Решение | Обоснование одной строкой |
|---|---|
| Фронт десктопа — **отдельное Vite-приложение**, не `output: 'export'` у Next | Экспорт требует вечного шва «две сборки из одной папки `app/`» и уводит различие оболочек в рантайм-флаги внутри разметки; Vite такого шва не создаёт и не трогает прод-сборку веба |
| Экраны переезжают в **`packages/ui`** (третий воркспейс) | 21 файл из 30 (~3700 строк) едет `git mv` без единой правки; без общего пакета десктоп неизбежно станет форком экранов |
| Между экранами и внешним миром — **контракт `UtmkaBackend` в ядре**, две реализации (`fetch` / `invoke`) | Порты `UtmkaRepository` объявлены в ядре, но в `apps/web` не используются **ни разу** — обещание §5 «десктоп получит SQLite без правки UI» сейчас не обеспечено ничем |
| Хранилище — **rusqlite со своими командами**, не `tauri-plugin-sql` | Контракт закрытый и крошечный (13 методов): произвольный SQL в вебвью не нужен, а правила (потолок 500, счётчики справочника, уникальность имени) обязаны жить рядом с транзакцией, а не в TS около UI |
| Установщик Windows — **только NSIS**, `installMode: currentUser` | Установка без UAC, как у 2.2.1; не тянет фичу VBSCRIPT; единственный путь к arm64 |
| Импорт из 2.2 — **чтением файла БД**, не через штатный экспорт | `export_history`/`export_templates` в 2.2 выбрасывают `created_at` — вся история схлопывается в сегодня |
| Порядок: **окно раньше кода, адаптер раньше Rust** | Первая сборка Tauri отделяет грабли среды от своих; адаптер, сделанный после Rust, означает переписывание экранов дважды |

---

## 1. Развилка: статический экспорт Next против отдельного Vite-фронта

### 1.1 Общая часть — то, что придётся сделать при любом выборе

Развилка стоит **поверх** большой общей работы, и эта работа заметно больше самой развилки.
Считать «Next против Vite» надо только по дельте, иначе спор идёт не о том.

| Общая часть (одинакова в обоих сценариях) | Объём |
|---|---|
| Выбрасывается серверный TS: `app/api/*` 681 строка (8 файлов) + server-only `lib/` 750 (`rate-limit` 116, `routerai` 163, `session` 107, `store` 316, `supabase` 48) + `redirect-fetch` 225 + `passphrase` 105 + `instrumentation` 56 | **1817 строк** |
| Не едет в десктоп UI входа, LLM-окна и аналитики: `LoginScreen` 356, `Assistant` 323 (разбирается, см. §4.3), `VaultGate` 43, `Metrika` 83 | **805 строк** |
| Удаляется чистое SEO: `opengraph-image` 69, `robots` 21, `sitemap` 16, блоки `metadata` в `layout` и 6 страницах ~113 | **219 строк** |
| Переводится с `fetch('/api/*')` на команды Tauri | **20 call-site в 9 файлах** |
| Переписывается на Rust: репозиторий поверх SQLite (порт `store.ts`, 316 строк), проверка редиректов (порт `redirect-fetch.ts`, 225 строк), сокращатель (67 строк) | — |

⚠️ Поимённая карта вызовов (`lib/account.ts` 2, `LoginScreen` 2, `QuickStart` 1, `SaveBar` 2,
`HistoryScreen` 4, `TemplatesScreen` 5, `LinkTools` 1, `RedirectCheck` 1, `Assistant` 2) даёт **20**;
один из зондов заявил 24. Расхождение сверить руками на Этапе 2 — оно ничего не меняет в выборе,
но влияет на чек-лист правки.

### 1.2 Сравнение

| Критерий | A. `output: 'export'` у `apps/web` | B. Отдельный Vite-фронт в `apps/desktop` |
|---|---|---|
| **Правок в `components/`** | 0 | **37 строк в 9 файлах** (`DeviceFrame` 9, `LoginScreen` 6, `Assistant` 5, `GeneratorScreen` 3, `HistoryScreen` 3, `LinkDetails` 3, `TemplatesScreen` 3, `SaveBar` 2, `VaultGate` 2) |
| **Правок в `globals.css` (2460 строк)** | 0 | 0 |
| **Нового кода оболочки** | ~60 строк: ветка по env в `next.config.ts` (~20) + prune-скрипт (~40) | ~175 строк: `index.html` 30 (сюда переезжают `THEME_BOOTSTRAP` и `DRAFT_BOOTSTRAP`), `main.tsx` 25, `routes.tsx` 45, `vite.config.ts` 25, `tsconfig` 25, eslint 15, `@font-face` 10 |
| **Судьба 8 роутов `app/api`** | Физически остаются в дереве и **валят экспорт на месте**: 7 из 8 читают `Request`. Значит перед каждой десктоп-сборкой `app/` копируется в промежуточную папку без `api/`, `opengraph-image`, `robots`, `sitemap` и с патченым `layout.tsx` | Не участвуют в сборке вовсе — другое приложение, другая точка входа. Файлы не трогаются |
| **`cookies()`, `headers()`, 6 × `force-dynamic`** | `force-dynamic` — жёсткая ошибка сборки; `headers()` с CSP — **молча игнорируется**, десктоп поедет без заголовков безопасности и никто не заметит | Не существуют в этой сборке |
| **Сборка и dev-петля** | `next build` + `next dev` как devUrl. На Windows Tauri убивает дочерний процесс, а Node-сервер Turbopack не всегда закрывается чисто → сирота держит порт 3000, следующий `tauri dev` падает | `vite build` + `vite dev`. Замеров скорости у нас нет — **это не аргумент в споре**; аргумент только в том, что dev-сервер один и лёгкий |
| **Риск расхождения веба и десктопа** | **Высокий.** Различие оболочек (нет входа, нет помощника, другой набор разделов) уходит в рантайм-флаги `__TAURI__` внутри `DeviceFrame`, `SaveBar`, `VaultGate`, `Assistant` — то есть в самые часто правимые файлы разметки. Такой шов не ловится типами | **Низкий.** Различие живёт в композиции: две точки входа собирают разные наборы экранов из одного `packages/ui`. Чего в десктопе нет — видно в дереве файлов |
| **Стоимость поддержки** | Prune-список обязан вечно знать всё серверное в `app/`. Любой новый роут в вебе **молча роняет релиз десктопа** — и не в PR, а когда кто-то соберёт релиз | Одна дополнительная точка входа + алиасы в двух `tsconfig`. Новый роут в вебе десктопа не касается вообще |
| **Прод веба** | `next.config.ts` живого приложения обрастает веткой по env — правка в файле, от которого зависит деплой | **Не меняется ни строкой** (кроме путей импорта после выноса в `packages/ui`) |
| **Глубокие ссылки под `tauri://`** | Экспорт отдаёт `/batch.html`, окно просит `/batch` — лечится `trailingSlash: true` и проверкой на живом окне | Снимается выбором hash-роутера: вопроса не возникает |
| **Шрифт** | `next/font` тянет Google Fonts **на сборке**. Релиз собирается с машины владельца под ТСПУ — забыть про это легко | Вендоренный `woff2` через `@font-face`: Vite к этому принуждает |
| **Что выигрывает A** | Ровно одно: ноль правок в компонентах | — |

**Чистая дельта B над A: 37 правок плюс ~115 строк оболочки.** Меньше рабочего дня, делается один раз.

### 1.3 Рекомендация

**Сценарий B — отдельный Vite-фронт в `apps/desktop`.**

Три довода, по убыванию веса.

1. **Шов в конфиге дешевле шва в разметке.** Единственный козырь A — ноль правок в
   `components/` — покупается тем, что одна папка `app/` обязана отдавать две сборки, а
   различие оболочек уезжает рантайм-флагами в пять файлов, которые правятся чаще всего.
   Prune-скрипт — это постоянная обязанность, а 37 правок — разовая.
2. **Next в этой оболочке не даёт ничего.** Из его возможностей приложение использует
   `metadata`, `opengraph-image`, `robots`, `sitemap` (219 строк чистого SEO — удаляются в
   обоих сценариях), route handlers (сервера в десктопе нет), `next/font` (заменяется
   вендоренным woff2 и под ТСПУ так надёжнее), `headers()` с CSP (её место занимает
   `app.security.csp` в `tauri.conf.json`) и клиентский роутер (react-router на 37 строк).
   `next/image` не используется ни разу, server actions нет, middleware нет, серверных
   компонентов с данными нет. Остаётся рантайм Next ради SPA, которое **и так SPA**:
   26 из 30 компонентов помечены `'use client'`, все 7 `page.tsx` — тривиальные обёртки.
3. **Прод не трогаем.** Веб продолжает собираться `output: 'standalone'` тем же Dockerfile.
   Сценарий A требует правки конфига живого приложения ради ветки, которой в вебе не пользуются.

⚠️ **Если по каким-то причинам выбирается всё-таки экспорт** — не делать prune-скрипт.
Завести десктопу физически свою папку `app/` с реэкспортом экранов из `packages/ui`: тогда
список того, чего в десктопе нет, виден глазами в дереве, а не спрятан в шаге сборки.

### 1.4 Раскладка после выбора B

```
products/UTMka-official-service/
├─ packages/
│  ├─ core/                  @utmka/core — правила + контракт оболочки (backend.ts)
│  └─ ui/                    @utmka/ui — 30 экранов, globals.css, NavPort, useShell
├─ apps/
│  ├─ web/                   Next 16, output: 'standalone' — БЕЗ ИЗМЕНЕНИЙ в сборке
│  │  ├─ app/                маршруты, роуты /api, SEO, layout
│  │  └─ lib/shell.ts        реализация: fetch + next/navigation + <a download>
│  └─ desktop/               Vite + React + react-router
│     ├─ index.html          THEME_BOOTSTRAP, DRAFT_BOOTSTRAP, @font-face
│     ├─ src/main.tsx, src/routes.tsx
│     ├─ src/lib/shell.ts    реализация: invoke + react-router + нативный диалог
│     └─ src-tauri/          Rust: 13 команд хранилища + 2 сетевые + импортёр 2.2
└─ legacy/desktop-2.2/       заморожен
```

Направление зависимостей не меняется: `core ← ui ← оболочки`. Ядро по-прежнему не знает
ни про React, ни про сеть.

🪤 **Три места, которые ломаются при появлении `packages/ui` и `apps/desktop`** — проверено по
файлам, не по памяти:

- `Dockerfile`, стадия `deps`, строки 15–18: копируются манифесты только `packages/core` и
  `apps/web`, а `npm ci` работает по общему локу. Появление воркспейса `apps/desktop`
  (он попадает под `apps/*` в корневом `package.json`) **сломает сборку образа веба** на
  рассинхроне лока. Лечится строками `COPY packages/ui/package.json ./packages/ui/` и
  `COPY apps/desktop/package.json ./apps/desktop/`.
- `.dockerignore` не исключает Rust-артефакты. Даже при `CARGO_TARGET_DIR` на другом диске
  добавить `**/target` и `apps/desktop/dist` — `COPY . .` в стадии `builder` копирует всё.
- Корневой `npm run build --workspaces` подхватит `apps/desktop`. Скрипт `build` там обязан
  быть `vite build`, а компиляция Rust — только под `tauri build`, иначе обычная проверка
  сборки начнёт тянуть 500 крейтов.

---

## 2. Адаптер платформы

### 2.1 Почему без него десктоп = форк экранов

`packages/core/src/repository.ts` честно объявляет `TemplatesPort`, `HistoryPort`,
`DictionaryPort`, `SettingsPort`, `UtmkaRepository`, `HISTORY_LIMIT`, `TEMPLATES_LIMIT`.
Grep по `apps/web` даёт **ноль употреблений любого из них**. Вместо портов HTTP протёк в экраны
четырьмя способами:

1. пути `'/api/...'` зашиты строками прямо в компонентах;
2. экраны разбирают HTTP-семантику руками: `response.ok`, `response.status === 401`
   (комментарий «не ошибка, а фразы нет» продублирован дословно в `HistoryScreen` и
   `TemplatesScreen`), ручной `json()` с приведением к `{items?, error?}`;
3. текст ошибки сети написан в шести местах по-разному («Сеть не отвечает», «Сеть недоступна —
   попробуйте позже», «Не получилось проверить») — при том, что правило проекта: формулировки
   живут в ядре рядом с `validate.ts`;
4. заголовки, `JSON.stringify` и `encodeURIComponent` — тоже в компонентах.

То есть обещание ARCHITECTURE §5 «единый интерфейс в core, две реализации, десктоп получит
SQLite без правки UI» сегодня не обеспечено ничем. Адаптер — не украшение плана, а **необходимое
условие** любого варианта из §1.

### 2.2 Контракт — `packages/core/src/backend.ts`

Ноль реализации, только типы. Расширяет существующий `repository.ts`, не заменяет его.

```ts
/**
 * Контракт оболочки. Ядро объявляет, ЧТО умеет внешний мир; КАК — знает только
 * оболочка: веб через роуты /api и Supabase, десктоп через invoke и SQLite.
 */
import type { DictionaryPort, HistoryItem, HistoryPort, Template, TemplatesPort } from './repository'
import type { RedirectReport } from './redirect'

/** Чего в этой оболочке нет как ПОНЯТИЯ — не «выключено», а «не существует». */
export interface Capabilities {
  auth: boolean                     // веб true, десктоп false
  assistant: boolean                // веб true, десктоп false
  storage: boolean                  // веб зависит от env, десктоп всегда true
  fileSave: 'browser' | 'native'    // <a download> или системный диалог
}

export interface NetPort {
  /** Сокращение через clck.ru: у сервиса нет CORS, поэтому это всегда чужая земля. */
  shorten(url: string): Promise<string>
  /** Проход по цепочке. Предохранители SSRF — на стороне оболочки, правила — в ядре. */
  checkRedirects(url: string): Promise<RedirectReport>
}

/** Пакетная запись: импорт файла не должен делать 500 круглых поездок. */
export interface ImportablePort<T> {
  importMany(rows: T[]): Promise<{ added: number; skipped: string[] }>
}

export interface AccountPort {                       // в десктопе не реализуется
  state(): Promise<'guest' | 'member'>
  login(passphrase: string): Promise<void>
  register(): Promise<{ passphrase: string }>
  logout(): Promise<void>
}

export interface AssistantPort {                     // в десктопе не реализуется
  quota(): Promise<{ left: number; limit: number }>
  brief(text: string, baseUrl: string): Promise<{ links: string[]; dropped: string[] }>
}

export interface UtmkaBackend {
  caps: Capabilities
  templates: TemplatesPort & ImportablePort<Omit<Template, 'id'>>
  history: HistoryPort & ImportablePort<Omit<HistoryItem, 'id'>>
  dictionary: DictionaryPort
  net: NetPort
  account: AccountPort | null        // null — входа нет как понятия
  assistant: AssistantPort | null    // null — помощника на LLM нет
}
```

Заодно контракт закрывает два хвоста, найденных при сверке роутов с вызовами:

- `PATCH /api/templates` (`updateTemplate` в `store.ts`) **из интерфейса не вызывается ни разу** —
  редактировать сохранённый шаблон в вебе сейчас нельзя, только удалить и создать заново.
  В 2.2 редактирование было. Это дыра в паритете, а не лишняя ручка (см. §8, вопрос 2);
- `DELETE /api/dictionary` (`removeValue`) есть в роуте и в `store.ts`, но нет в порту и не
  вызывается из UI. Либо дописать в `DictionaryPort`, либо снести — но не оставлять как есть;
- `SettingsPort` **не реализован нигде**: настройки живут пятью ключами `localStorage`
  (`utmka.theme`, `utmka.mode`, `utmka.view.history`, `utmka.view.templates`,
  `utmka.onboarding.v2`), а колонка `users.settings jsonb` в Supabase мертва. Решение — §3.7.

### 2.3 Одна доменная ошибка вместо HTTP-семантики в экранах

```ts
export type BackendErrorKind =
  | 'auth'      // нужна кодовая фраза; в десктопе не приходит никогда
  | 'limit'     // упёрлись в потолок 500 или в дневную квоту помощника
  | 'conflict'  // имя шаблона занято
  | 'offline'   // сеть не ответила
  | 'rejected'  // адрес не прошёл предохранители

export class BackendError extends Error {
  readonly kind: BackendErrorKind
  constructor(kind: BackendErrorKind, message: string) {
    super(message)
    this.name = 'BackendError'
    this.kind = kind
  }
}

/** Формулировки — в ядре, рядом с текстами validate.ts. Правило проекта. */
export const BACKEND_MESSAGES: Record<BackendErrorKind, string> = {
  auth: 'Чтобы сохранить, заведи кодовую фразу',
  limit: 'Больше 500 записей не храним — удали лишнее',
  conflict: 'Шаблон с таким названием уже есть',
  offline: 'Сеть не отвечает — попробуй ещё раз',
  rejected: 'Такой адрес проверить нельзя',
}
```

После этого `catch (e) { if (e.kind === 'auth') … }` работает одинаково в обеих оболочках,
а в десктопе `kind === 'auth'` просто не приходит никогда.

### 2.4 Веб-реализация — `apps/web/lib/shell.ts`

Роуты `/api/*` **не меняются вообще**: серверная часть остаётся как есть, переезжают только
20 вызовов из компонентов внутрь одного файла.

```ts
import { BACKEND_MESSAGES, BackendError, type Template, type UtmkaBackend } from '@utmka/core'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { cache: 'no-store', ...init })
  } catch {
    throw new BackendError('offline', BACKEND_MESSAGES.offline)
  }
  if (response.status === 401) throw new BackendError('auth', BACKEND_MESSAGES.auth)
  const data = (await response.json().catch(() => ({}))) as { error?: string } & T
  if (!response.ok) throw new BackendError('rejected', data.error ?? BACKEND_MESSAGES.rejected)
  return data
}

export const backend: UtmkaBackend = {
  caps: { auth: true, assistant: true, storage: true, fileSave: 'browser' },
  templates: {
    list: () => call<{ items: Template[] }>('/api/templates').then((d) => d.items),
    create: (input) =>
      call<{ item: Template }>('/api/templates', { method: 'POST', body: JSON.stringify(input) })
        .then((d) => d.item),
    update: (id, patch) =>
      call<{ item: Template }>('/api/templates', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...patch }),
      }).then((d) => d.item),
    remove: (id) => call<void>(`/api/templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    // Цикл по строкам остаётся ЗДЕСЬ. Экраны о нём не знают — и в десктопе его не будет.
    importMany: async (rows) => { /* … */ },
  },
  // history, dictionary, net, account, assistant — там же
}
```

### 2.5 Tauri-реализация — `apps/desktop/src/lib/shell.ts`

Те же методы через `invoke`. Rust отдаёт ошибку структурой `{ kind, message }`, чтобы
доменный тип не пересобирался из строки.

```ts
import { invoke } from '@tauri-apps/api/core'
import { BACKEND_MESSAGES, BackendError, type UtmkaBackend } from '@utmka/core'

async function cmd<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(name, args)
  } catch (raw) {
    const e = raw as { kind?: BackendError['kind']; message?: string }
    throw new BackendError(e.kind ?? 'rejected', e.message ?? BACKEND_MESSAGES.rejected)
  }
}

export const backend: UtmkaBackend = {
  caps: { auth: false, assistant: false, storage: true, fileSave: 'native' },
  templates: {
    list: () => cmd('templates_list'),
    create: (input) => cmd('templates_create', { input }),
    update: (id, patch) => cmd('templates_update', { id, patch }),
    remove: (id) => cmd('templates_remove', { id }),
    importMany: (rows) => cmd('templates_import', { rows }),   // одна транзакция, не 500
  },
  history: {
    list: (limit) => cmd('history_list', { limit }),
    add: (input) => cmd('history_add', { input }),             // + trim + track внутри
    remove: (id) => cmd('history_remove', { id }),
    clear: () => cmd('history_clear'),
    importMany: (rows) => cmd('history_import', { rows }),
  },
  dictionary: {
    list: () => cmd('dictionary_list'),
    track: (params) => cmd('dictionary_track', { params }),
    merge: (kind, alias, canonical) => cmd('dictionary_merge', { kind, alias, canonical }),
  },
  net: {
    shorten: (url) => cmd('net_shorten', { url }),
    checkRedirects: (url) => cmd('net_check_redirects', { url }),
  },
  account: null,
  assistant: null,
}
```

### 2.6 Навигация и сохранение файлов

Два оставшихся места, где экраны знают о фреймворке.

**NavPort.** `next/link` в 4 файлах (8 тегов `<Link>`), `next/navigation` в 7 файлах (12 мест:
`usePathname`, `useRouter`+`push`, `useSearchParams` с типом `ReadonlyURLSearchParams` в
сигнатуре `draftFromSearch`). Контракт живёт в `packages/ui` (он React-формы, в ядре ему нельзя):

```ts
// packages/ui/src/nav.ts
export interface Nav {
  path: string
  go(to: string): void
  params: URLSearchParams          // вместо ReadonlyURLSearchParams из next
}
export type NavLink = ComponentType<{ to: string; className?: string; children: ReactNode }>
```

Реализация веба — `next/link` + `useRouter` + `usePathname` (~35 строк), десктопа — react-router
(~35 строк). Роутер в десктопе — **hash**: перезагрузка окна не сбрасывает экран, а вопрос
«`/batch` или `/batch.html` под протоколом Tauri» не возникает вовсе. Memory-роутер — допустимая
альтернатива, если перезагрузку на генератор считать желаемым поведением.

**Сохранение файлов.** `lib/exchange.ts` (306 строк) сети не касается и едет как есть, кроме
`download()` — `Blob` + `URL.createObjectURL` + `a.download`. Тот же приём в `BatchScreen.tsx:97`,
`LinkTools.tsx:66,82`, `LoginScreen.tsx:147`. В окне Tauri ссылка со скачиванием ведёт себя иначе,
чем в браузере, поэтому в контракт оболочки добавляется одна функция:

```ts
saveFile(name: string, mime: string, body: string): Promise<void>
// веб    → Blob + <a download>, как сейчас
// десктоп → plugin-dialog (save) + plugin-fs (writeTextFile)
```

Это **функция из списка паритета §4.1** («импорт/экспорт JSON и CSV, обе стороны») и в 2.2 она
была единственным способом унести данные между компьютерами. Проверяется на живом окне, не в
dev-браузере, где download работает по-браузерному.

`navigator.clipboard` (7 мест) в Tauri закрывается плагином clipboard-manager; `navigator.share`
(`LoginScreen.tsx:157`) в Tauri нет — но `LoginScreen` в десктоп и не едет.

### 2.7 Как подменяется — алиасом, а не контекстом

Экраны импортируют `import { backend, useNav, saveFile } from '@utmka/ui/shell'`, а сам
`shell` — тонкий реэкспорт из алиаса `#shell`, который каждое приложение направляет в свой файл:

| Приложение | Алиас `#shell` | Где задаётся |
|---|---|---|
| `apps/web` | `apps/web/lib/shell.ts` | `tsconfig.paths` + резолвер сборщика в `next.config.ts` (ключ `turbopack.resolveAlias` — **сверить с докой в `node_modules/next/dist/docs` перед правкой**, версия свежая) |
| `apps/desktop` | `apps/desktop/src/lib/shell.ts` | `tsconfig.paths` + `resolve.alias` в `vite.config.ts` |

Почему не React-контекст: `DeviceFrame` рисуется в layout, а окно помощника живёт в рамке
устройства, а не на экране — провайдер пришлось бы тащить через всё дерево. Почему не
синглтон-`install()`: он даёт порядковую зависимость «поставить до первого рендера» и падает в
рантайме, а алиас проверяется типами на сборке. Состояние входа при этом остаётся **внешним
стором** на `useSyncExternalStore`, как сейчас (`lib/account.ts`) — публичная сигнатура
`useAccount()` не меняется, 7 компонентов её не замечают.

### 2.8 caps вместо гейтов по входу

`useAccount()` читается в `DeviceFrame`, `Assistant`, `QuickStart`, `SaveBar`, `HistoryScreen`,
`TemplatesScreen`, `LoginScreen`. Проверки вида `if (state !== 'member') return null` и
`if (state === 'guest') return <приглашение>` **физически скрывают** быстрый старт, сохранение,
историю и шаблоны.

⚠️ Если просто вырезать `lib/account.ts` как ненужный, пользователь десктопа увидит рекламу
входа, которого нет, вместо своих шаблонов — и это не упадёт, а тихо покажет заглушку.

Правка механическая и делается **до** написания десктопных экранов:

```tsx
// было
if (state !== 'member') return null
// стало
if (caps.auth && state !== 'member') return null
```

В десктопной реализации `state` всегда `'member'`, `storage` всегда `true`, `caps.auth === false`.

Различие набора разделов решается композицией, а не флагом: `DeviceFrame` принимает список
разделов и слот статус-бара пропсами, а хост (веб или десктоп) их подставляет. Разовая правка,
~30 строк.

---

## 3. Хранилище

### 3.1 Что говорит контракт ядра

4 порта, 13 методов, и **ни одного упоминания пользователя**. Мультиарендность целиком забота
оболочки: веб берёт `user_hash` из куки на уровне роута. Следствие для SQLite прямое — в схеме
не нужны ни таблица `users`, ни колонка `user_hash`. Все методы асинхронные (`invoke` ложится без
обёрток), все `id` строковые, `createdAt`/`updatedAt` — строки ISO (UI кормит ими `new Date`).

### 3.2 Схема SQLite

Получается из `apps/web/supabase/migrations/utmka_0001_init.sql` вычитанием всего серверного:
`users`, `llm_usage`, `rate_limits` не едут (LLM нет, лимиты частоты в локальном приложении
бессмысленны), `user_hash` не едет тоже. `jsonb` → `TEXT` с JSON, `timestamptz` → `TEXT` ISO-8601
UTC, `uuid` → `TEXT` с uuid v4 из Rust.

```sql
-- 0001_init.sql ; PRAGMA user_version = 1 ; journal_mode = WAL ; foreign_keys = on

create table templates (
  id         text primary key,
  name       text not null,
  base_url   text not null default '',
  params     text not null default '{}',      -- JSON {source,medium,campaign,content,term}
  tag_name   text,
  tag_color  text,
  preset_id  text,
  created_at text not null,
  updated_at text not null
);
create unique index templates_name_uniq on templates (lower(name));
create index templates_updated_idx on templates (updated_at desc);

create table links (
  id         text primary key,
  url        text not null,
  base_url   text not null default '',
  params     text not null default '{}',
  short_url  text,
  tag_name   text,
  tag_color  text,
  origin     text not null check (origin in ('single','batch','brief','parse')),
  batch_id   text,
  created_at text not null
);
create index links_created_idx on links (created_at desc);

create table dict_values (
  kind          text not null check (kind in ('source','medium','campaign','content','term')),
  value         text not null,
  uses          integer not null default 1,
  canonical     text,
  first_seen_at text not null,
  last_used_at  text not null,
  primary key (kind, value)
) without rowid;
create index dict_kind_uses_idx on dict_values (kind, uses desc);

create table settings (key text primary key, value text not null);
create table meta     (key text primary key, value text not null);
```

**Почему `params` одним JSON, а не пятью колонками как в 2.2:** адаптер тогда повторяет
`toTemplate`/`toHistory` из `store.ts` один в один, форматы импорта и экспорта не расходятся с
вебом, а шестой параметр (`utm_id`, `yclid`) не потребует миграции. Фильтровать в SQL не нужно:
поиск и по истории, и по шаблонам делается на клиенте по уже загруженному списку, а список
ограничен пятьюстами. Для чтения глазами при отладке годятся generated-колонки через
`json_extract` — без раздвоения истины.

**Шифрование не нужно.** Ни ПД, ни секретов в базе нет (кодовой фразы в десктопе не существует),
2.2 тоже хранила открыто. SQLCipher добавил бы зависимость и сломал бэкап копированием файла.

**Путь к файлу:** `%APPDATA%\Roaming\UTMka\3.0\utmka.db` (macOS/Linux — аналогично внутри
существующей папки `UTMka`). Каталог создаётся самим приложением (`create_dir_all`): на чистой
машине его нет, и SQLite отвечает невнятным `unable to open database file` (код 14). Имя папки
в `app_data_dir` задаёт идентификатор приложения Tauri, поэтому «просто положить рядом с 2.2»
само не выйдет — путь задаём явно.

### 3.3 Способ доступа: rusqlite со своими командами

| | `tauri-plugin-sql` (2.4.0, поверх sqlx) | **rusqlite + свои команды** |
|---|---|---|
| Миграции | из коробки (`Migration { version, description, sql, kind }`) | руками: `rusqlite_migration` либо `PRAGMA user_version` + `match`, ~30 строк |
| Что видит вебвью | произвольный `select`/`execute` через `sql:default` | закрытый список из 13 команд, перечисленных в capabilities |
| Транзакции | нет: вставка + trim + track — три круга через IPC | вставка + trim + track одним `BEGIN…COMMIT` |
| Где живут правила | в TS рядом с UI — и начнут расходиться с серверными | рядом с транзакцией, одним модулем |
| Ошибки | ловятся сопоставлением строки `UNIQUE constraint failed` | `SqliteFailure` с расширенным кодом **2067** (`SQLITE_CONSTRAINT_UNIQUE`) → свой вариант |
| Типизация | каст, а не проверка | serde-структуры с `rename_all = "camelCase"` ложатся на `Template`/`HistoryItem`/`DictEntry` без ручного маппинга |
| Кода на Rust | почти нет | ~300–400 строк на весь слой |

**Берём rusqlite.** Единственный весомый плюс плагина — миграции — покрывается тридцатью
строками, а его минусы бьют ровно туда, где в этом продукте больно: правила обязаны быть одни
на веб и десктоп, иначе монорепо теряет смысл.

⚠️ **Не смешивать оба подхода в одном бинарнике.** `rusqlite` (feature `bundled`) и `sqlx`
тянут `libsqlite3-sys`; при несовпадении версий сборка падает на линковке дублирующимися
символами, и ловится это не сразу. Взять плагин ради миграций и rusqlite ради логики — нельзя.
Записать в ARCHITECTURE §11: «SQLite в десктопе ровно один путь».

Пример команды — видно, зачем нужна транзакция:

```rust
#[derive(serde::Serialize)]
pub struct CmdError { kind: &'static str, message: String }   // ложится на BackendError в TS

#[tauri::command]
async fn history_add(db: tauri::State<'_, Db>, input: NewLink) -> Result<Link, CmdError> {
    let pool = db.pool.clone();
    // Синхронные команды Tauri v2 исполняются в главном потоке: список на 500 строк
    // и импорт подмораживают окно. Всё, что трогает диск, — через spawn_blocking.
    tauri::async_runtime::spawn_blocking(move || {
        let mut conn = pool.get()?;
        let tx = conn.transaction()?;
        let item = insert_link(&tx, input)?;
        trim_links(&tx)?;                     // потолок 500 — здесь, а не триггером
        track_values(&tx, &item.params)?;     // справочник наполняется ТОЛЬКО здесь
        tx.commit()?;
        Ok(item)
    }).await?
}
```

### 3.4 Миграции

`PRAGMA user_version` + линейный список. `0001_init` — схема из §3.2. Тест на пустой базе и тест
на базе предыдущей версии — обязательны с самого начала, иначе первая же миграция в 3.0.1
поедет вслепую.

🪤 WAL создаёт рядом файлы `-wal` и `-shm`: бэкап копированием без checkpoint отдаёт неполную
базу. Для выгрузки — `VACUUM INTO` либо закрытие соединения.

### 3.5 Правила, которые обязаны переехать вместе с данными

В `apps/web/lib/store.ts` спрятана бизнес-логика, которую все считают «ядром». Если переписать
её на Rust «по смыслу», веб и десктоп разойдутся — ровно то, что монорепо создавался предотвращать.

| Правило | Как сделано в вебе | Как обязано быть в SQLite |
|---|---|---|
| Потолок истории 500 | `trimHistory()` — выбирает id с 500-го по 699-й и удаляет, отдельным запросом после вставки | `delete from links where id in (select id from links order by created_at desc, rowid desc limit -1 offset 500)` — **в той же транзакции**; `rowid` как разрыв ничьей, иначе при совпадении миллисекунды порядок неопределён |
| Потолок шаблонов 500 | отдельный `select count` перед вставкой, не констрейнт | так же, `count` в транзакции |
| Уникальность имени шаблона | ловится по коду Postgres `23505` → текст «Шаблон с таким названием уже есть» | код SQLite другой (**2067**); при дословном переносе текст потеряется |
| Наполнение справочника | `trackValues()` вызывается **внутри** `addHistory`, отдельной ручки нет | так же — но это самая опасная неявность плана, см. ниже |
| Инкремент `uses` | цикл `select` → `update`/`insert` с оговоркой про отсутствие гонок | атомарно: `insert … on conflict(kind, value) do update set uses = uses + 1, last_used_at = excluded.last_used_at` — десктоп здесь **строго лучше** веба |

⚠️ **Справочник наполняется побочным эффектом сохранения ссылки.** Если в десктопе реализовать
голый `insert`, справочник значений — главная новая ценность 3.0 — перестанет наполняться, и это
не проявится ни падением, ни ошибкой: просто пустой экран. Зафиксировать в JSDoc `HistoryPort.add`
(«обязан учесть значения в справочнике») и завести приёмочный случай «сохранил ссылку → в
справочнике появились её значения с `uses = 1`».

Отдельно, до Rust: правила и тексты отказов поднимаются из `store.ts` в `@utmka/core` чистыми
функциями над портами (`applyHistoryLimit(list)`, `trackValues(params, port)`), а формулировки —
в тот же словарь, где живут `Issue` из `validate.ts`. Тогда SQLite отвечает только за хранение
строк, а правила остаются одни на обе оболочки и покрыты существующими 149 тестами.

Туда же переезжают парсеры из `lib/exchange.ts` (`parseTemplatesCsv`, `parseTemplatesJson`,
`parseHistory`, `*ToJson`, `*ToCsv`) — они чистые, ноль DOM. 🪤 Сейчас CSV разбирается **дважды**
разным кодом: в `packages/core/src/batch.ts` и в `exchange.ts` (разное определение разделителя
`,` vs `;`, разные наборы синонимов заголовков, два одинаковых 20-строчных парсера кавычек в
одном файле). Расхождение поведения между пакетным импортом и импортом шаблонов возможно уже
сейчас, до всякого десктопа.

### 3.6 Импорт из 2.2

Данные владельца живые и ждут (проверено чтением копий, оригиналы не тронуты):

| Файл | Что внутри |
|---|---|
| `C:\Users\tjfor\AppData\Roaming\UTMka\databases\utmka.db` | рабочая база 2.2.1, 61 КБ: `history_new` 31 строка, `templates` 13, `users`/`subscriptions` пусты, `user_email` везде `local_user` |
| `C:\Users\tjfor\AppData\Roaming\UTMka\utm_data.db` | база более старой сборки, 0 строк, **и в ней у `history_new` нет колонок `short_url`, `tag_name`, `tag_color`** |
| `legacy/desktop-2.2/utm_data.db` | dev-база в репозитории, две мусорные строки |

⚠️ **Через штатный экспорт 2.2 переносить нельзя:** `export_history` и `export_templates`
(`history.py:111`, `templates.py:126`) выбрасывают `id`, `user_email` и `created_at` — вся
история схлопывается в сегодня. Читать надо саму БД, вторым соединением в режиме только для
чтения. Файловый импорт остаётся запасным путём (`parseTemplatesJson` уже понимает плоский формат
2.2 с префиксами `utm_`), и в интерфейсе честно писать, что даты в файле не сохраняются.

Отображение полей:

| 2.2 | 3.0 |
|---|---|
| `history_new.full_url` | `links.url` **как есть** |
| `history_new.utm_*` (5 колонок) | `links.params` (пустые строки и NULL пропускать, иначе в модель попадут пустые ключи) |
| `short_url`, `tag_name`, `tag_color`, `created_at` | одноимённые |
| — | `origin = 'single'` (соответствия в 2.2 нет), `batch_id = null`, `id` — новый uuid |
| `templates.name`, `utm_*`, теги, `created_at` | одноимённые; `updated_at = created_at`, `base_url = ''` (в 2.2 у шаблона базового адреса не было), `preset_id = null` |

Ловушки, каждая проверена на живых данных:

1. **Даты.** 2.2 писала `datetime.utcnow()` без таймзоны (`2026-05-27 10:02:40.476694`).
   `new Date` прочитает это как локальное время, у владельца UTC+4 — вся история уедет на четыре
   часа. Нормализовать: пробел → `T`, дописать `Z`.
2. **Набор колонок.** Проверять через `PRAGMA table_info`, а не полагаться на модель, и смотреть
   в оба места плюс `./utm_data.db` рядом с исполняемым файлом.
3. **Потолок.** В 2.2 500 — это `LIMIT` в выборке (`history.py:23`), удаления не было **никогда**.
   В 3.0 это вытеснение при вставке. Считать строки до импорта и показывать в диалоге:
   «в базе 2.2 столько-то ссылок, перенесём последние 500».
4. **Уникальность имени шаблона** появилась только в 3.0. Импорт 13 шаблонов может частично
   отвалиться — перечислять пропущенные поимённо, а не числом «загружено 8 из 13».
5. **`full_url` хранится закодированным, а `utm_*`-колонки — раскодированными**: в живой строке
   `utm_term` равен `free, -30%, registration`, тогда как в самой ссылке это процентная кодировка.
   Источник значений — колонки; url брать как есть и **не пересобирать через `build`**, иначе
   исторические ссылки задним числом станут не теми, что реально ушли в площадку.
6. **Плейсхолдеры площадок** в данных уже есть (`{campaign_id}`, `{ad_id}` с датой) и обязаны
   остаться буквальными — ещё аргумент ничего не пересобирать.
7. **Справочник засеять**: прогнать каждую импортированную ссылку через тот же `track`. Тогда
   после переезда справочник и детектор расщеплений сразу непустые.
8. **Файл 2.2 открывать только на чтение и не удалять** — 2.2.1 остаётся установленной и обязана
   работать. Отметку «импорт выполнен» ставить в таблицу `meta`, чтобы не предлагать дважды.

UX: не автоматом. При первом запуске — диалог «нашли данные версии 2.2: 31 ссылка и 13 шаблонов,
перенести?», числа считать из файла.

`preferences.json` (theme, lang, onboarding_done) переносится в две строки; `lang` игнорируем —
RU/EN отменён.

### 3.7 Настройки

`SettingsPort` не реализует ни одна оболочка. Веб держит настройки пятью ключами `localStorage`,
каждый своим хуком на `useSyncExternalStore`, чтение синхронное; `THEME_BOOTSTRAP` встраивается
в `<head>` против мигания.

**Решение: на первой версии оставить `localStorage`** (ноль кода, поведение один в один с вебом,
вебвью Tauri даёт свой профиль и переживает перезапуск), а таблицу `settings` завести в схеме
сразу — чтобы вторым заходом включить `SettingsPort` без миграции. Принимаемая потеря: чистка
профиля вебвью или смена идентификатора приложения сбрасывают тему и режимы. Это косметика, не
данные.

Чего нельзя оставлять — интерфейс без единой реализации: либо в `repository.ts` к `SettingsPort`
приписывается «в вебе намеренно не реализован, живёт в localStorage», либо порт удаляется.

---

## 4. Что выкидывается в десктопе

### 4.1 Роуты `app/api/*` (681 строка, 8 файлов)

| Роут | Строк | Судьба | Почему / чем заменяется |
|---|---|---|---|
| `session` | 106 | **выкидывается** | Пользователь один и локальный, восстановления и так нет |
| `assistant/brief` | 218 | **выкидывается** | LLM в десктопе нет по ASSISTANT-SPEC п.4. Вместе с ним уходят таблица `llm_usage` и функции `spend_llm_quota`/`refund_llm_quota` |
| `health` | 6 | **выкидывается** | Веб-специфика: Docker HEALTHCHECK |
| `templates` | 80 | → 4 команды Tauri поверх SQLite | Ядро продукта. Форма данных не меняется: `Template` живёт в `@utmka/core` |
| `history` | 64 | → 4 команды + `trim` + обязательный `track` | То же; неявный побочный эффект см. §3.5 |
| `dictionary` | 84 | → 3 команды | Справочник и детектор расщепления — то новое, ради чего делалась 3.0 |
| `shorten` | 67 | → 1 команда, ~15 строк Rust | На сервер вынесен только из-за отсутствия CORS у `clck.ru`; у Tauri свой HTTP-клиент мимо CORS. Лимит частоты не нужен (он защищал не пользователя, а нас), `assertPublicUrl` из ядра оставить |
| `redirect-check` | 56 | → 1 команда Rust | Из вебвью чужой домен не опросить. Самый дорогой перенос, см. §7 |

### 4.2 Модули `lib/`

| Модуль | Строк | Судьба | Почему |
|---|---|---|---|
| `session.ts` | 107 | выкидывается | Входа нет |
| `passphrase.ts` | 105 | выкидывается | Кодовой фразы нет |
| `passphrase-shape.ts` | — | выкидывается | То же |
| `supabase.ts` | 48 | выкидывается | Заменяется SQLite: у десктопа нет ни удалённой базы, ни ключа к ней. (Риск общего service-role с курсом, который числился в аудите §7, к этому моменту уже закрыт переездом на отдельный проект 2026-08-12 — десктоп его не наследует и не решает.) `storageConfigured()` вырождается в константу `true` |
| `routerai.ts` | 163 | выкидывается | LLM нет |
| `rate-limit.ts` | 116 | выкидывается | IP нет, мультиарендности нет, платного ресурса нет. 🪤 Но `readJson` живёт в этом модуле не по делу — `templates`/`history`/`dictionary` тянут «лимиты» только ради неё; при разборке отселить в `lib/http.ts` (гигиена веба) |
| `instrumentation.ts` | 56 | выкидывается | Keep-alive routerai раз в 3 минуты |
| `store.ts` | 316 | правила → в ядро, хранение → Rust/SQLite | §3.5 |
| `redirect-fetch.ts` | 225 | → команда Rust | §7, три неочевидных решения нельзя потерять |
| `account.ts` | 84 | **не удаляется, а вырождается** | `state` всегда `'member'`, `storage` всегда `true`, `caps.auth = false`. Удаление ломает интерфейс молча (§2.8) |
| `exchange.ts` | 306 | парсеры → в ядро, `download()` → нативный диалог | Паритетная функция §4.1 |
| `theme.ts`, `view.ts`, `mode.ts` | — | едут как есть, правок ноль | `localStorage` + `MutationObserver` на `<html data-theme>`; `THEME_BOOTSTRAP` переезжает в `index.html` |
| `assistant-bridge.ts` | — | код остаётся, потребителя нет | Одноразовый стор «помощник → пакетный режим»; сети не касается |
| `draft-bootstrap.ts` | — | не едет | Существует ради Метрики (снять utm из адресной строки, чтобы счётчик не утащил чужой адрес кампании); в десктопе нет ни адресной строки, ни счётчика |

### 4.3 Компоненты

| Компонент | Строк | Судьба |
|---|---|---|
| `LoginScreen.tsx` | 356 | не едет целиком |
| `VaultGate.tsx` | 43 | не едет: гейтить нечего |
| `Metrika.tsx` | 83 | не едет: аналитики в приложении нет |
| `Assistant.tsx` | 323 | ⚠️ **разбирается, а не выкидывается.** Этот же компонент рисует планку маскота с настроением (`useSetMascotLine`), а помощник «на правилах» (реплики из `Issue` ядра) в десктопе остаётся и работать обязан. Вырезать надо окно брифа и квоту |

### 4.4 Итог

Из 16 позиций серверного слоя **6 не едут вовсе**, 5 становятся командами Tauri, 1 остаётся
чистым TS с переездом в ядро, 4 клиентских стора едут без правок. В строках: 1817 серверного TS
выбрасывается, ~805 строк UI не едет, ~700 строк Rust пишется взамен.

---

## 5. Требования к машине и тулчейну

### 5.1 Windows: что уже есть, что ставить

Проверено вживую на машине владельца (read-only: реестр, `vswhere`, файловая система).

| Компонент | Состояние | Что делать | Вес | Права |
|---|---|---|---|---|
| WebView2 Evergreen | **есть**, `pv = 128.0.2739.79` | ничего | — | — |
| MSVC Build Tools (`VC.Tools.x86.x64`) | **есть дважды**: VS Community 2022 (17.11.35312.102) и Build Tools 2019 (16.11); toolset 14.41.34120, Windows SDK 10.0.19041.0, `kernel32.Lib` для x64 на месте | ничего | ~7–10 ГБ уже оплачено | — |
| Node / npm | **есть**, v24.13.0 / 11.6.2 (корень требует `>=20`) | ничего | — | — |
| **Rust** | **НЕТ** — `rustc`, `cargo`, `rustup` не найдены ни в bash, ни в PATH | `winget install --id Rustlang.Rustup`, затем `rustup default stable-msvc` | 1,5–2,5 ГБ (растёт с кэшем registry) | **не нужны**: rustup ставится в профиль пользователя |
| `CARGO_HOME` / `RUSTUP_HOME` / `CARGO_TARGET_DIR` | не заданы | увести на D: **до** установки: `D:\rust\cargo`, `D:\rust\rustup`, `D:\rust\target\utmka` | — | не нужны (переменные пользователя) |
| Исключения Defender на `CARGO_HOME` и `CARGO_TARGET_DIR` | нет | `Add-MpPreference -ExclusionPath` | — | **админ** |
| `LongPathsEnabled` | не проверено | `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem` | — | **админ** |
| Фича Windows «VBSCRIPT» | не нужна | только для сборки `.msi` — а мы её не собираем | — | админ |

Проверка после установки: `rustup show` обязан выдать `stable-x86_64-pc-windows-msvc`. GNU-тулчейн
Tauri не подойдёт — классическая ошибка новичка `linker 'link.exe' not found` растёт отсюда.
Если `link.exe` не находится и при MSVC — запускать сборку из «x64 Native Tools Command Prompt
for VS 2022».

Заводить проект **не** через `npm create tauri-app` (он перепишет раскладку монорепо), а
`cd apps/desktop && npm i -D @tauri-apps/cli && npx tauri init` — создаётся `apps/desktop/src-tauri/`.
Про npm workspaces Tauri ничего не знает и знать не хочет: в `tauri.conf.json` важны только
`devUrl` и `frontendDist`.

### 5.2 Версии (на 2026-08-12, запрошены у crates.io и npm)

| Cargo | Версия | npm | Версия |
|---|---|---|---|
| `tauri` | 2.11.5 | `@tauri-apps/cli` | 2.11.4 |
| `tauri-build` | 2.6.3 (**MSRV 1.85**) | `@tauri-apps/api` | 2.11.1 |
| `tauri-cli` | 2.11.4 | `@tauri-apps/plugin-updater` | 2.10.1 |
| `tauri-plugin-updater` | 2.10.1 | `@tauri-apps/plugin-dialog` | 2.7.2 |
| `tauri-plugin-dialog` | 2.7.2 | `@tauri-apps/plugin-fs` | 2.5.1 |
| `tauri-plugin-opener` | 2.5.4 | `@tauri-apps/plugin-clipboard-manager` | 2.3.2 |
| `rusqlite` (feature `bundled`) | по месту | `@tauri-apps/plugin-http` | 2.5.9 (если сокращатель делать с фронта) |

⚠️ Заявленный в манифестах MSRV 1.77.2 — фикция ради совместимости с Windows 7. Реально
`tauri-build` требует **1.85**, а у `tauri-cli` на Windows фактический пол ~1.88 из-за
транзитивных зависимостей. **Никакого `rust-toolchain.toml` с пином на старую версию** — берём
`stable` и обновляемся.

Vite-сборка под окно: `server: { port: 1420, strictPort: true }`, `clearScreen: false`,
`build.target: 'chrome105'` (Windows) / `'safari13'` (macOS) — не по последнему WebView2 на машине
разработчика, у пользователей рантаймы разные.

### 5.3 Артефакт и установщик

| | MSI (WiX v3) | **NSIS (`<app>-setup.exe`)** |
|---|---|---|
| Собирается | только на Windows | кросс-собирается и с Linux/macOS |
| Требует фичу VBSCRIPT | да | нет |
| Установка без прав администратора | настраивается | `installMode: currentUser` — по умолчанию, в `%LOCALAPPDATA%` |
| arm64 | не заявлен | `aarch64-pc-windows-msvc` собирается |
| Языки | по инсталлятору на язык | один установщик со всеми переводами |

**Берём только NSIS** (`bundle.targets: ["nsis"]`, `installMode: currentUser`): 2.2.1 раздавалась
обычным `.exe`, аудитория к UAC не приучена, MSI осмысленен ровно в одном сценарии — раскатка по
GPO в корпоративной сети, которого у продукта нет.

WebView2 (`bundle.windows.webviewInstallMode`): целевая ОС — Win10 1803+ и Win11, рантайм там уже
есть, `downloadBootstrapper` достаточно. Но продукт позиционируется в том числе как офлайн-версия
(блок `UtmkaOffline` на лендинге) — если офлайн-установка правда сценарий, `embedBootstrapper`
за +1,8 МБ дешевле любых объяснений (см. §8, вопрос 5).

CSP: `headers()` из `next.config.ts` в десктопе не существует, её место занимает
`app.security.csp` в `tauri.conf.json`. Tauri сам дописывает хеши локальных скриптов и nonce
внешних на этапе компиляции, поэтому нынешний `'unsafe-inline'` (нужный ради бутстрап-скрипта
темы) в десктопе, возможно, удастся убрать вовсе — но это проверяется руками, а не верой. Хост
Метрики из политики вычёркивается: счётчика там нет.

Authenticode-подпись против SmartScreen: **откладываем**. 2.2.1 и так раздаётся неподписанной,
регрессии нет; OV-сертификат доступен физлицу, но предупреждение держится, пока копится
репутация, EV даёт репутацию сразу и стоит дороже (см. §8, вопрос 4).

### 5.4 Обновления

2.2 умела OTA-обновления — это пункт паритета, а не украшение.

```
npm run tauri add updater
npm run tauri signer generate -- -w <путь вне рабочего дерева>
```

- `bundle.createUpdaterArtifacts: true` — рядом с `nsis` появятся `.sig`;
- `plugins.updater.pubkey` — публичный ключ, коммитить безопасно;
- `endpoints: ["https://github.com/Goryuchnick/UTMka-official-service/releases/latest/download/latest.json"]`,
  подстановки `{{current_version}}`, `{{target}}`, `{{arch}}`;
- `windows.installMode: "passive"`;
- разрешение `"updater:default"` в `src-tauri/capabilities/default.json`.

⚠️ Дословно из документации: подпись апдейтера **обязательна и отключить её нельзя**. Это
собственная подпись Tauri, никак не связанная с Authenticode. Приватный ключ передаётся только
настоящими переменными окружения (`TAURI_SIGNING_PRIVATE_KEY`, `…_PASSWORD`) — файлы `.env`
**не читаются**. Репозиторий публичный, поэтому ключ живёт в GitHub Actions Secrets плюс личной
копией в Vaultwarden владельца (`pass.alex-pronin.ru`) и **в дерево проекта не попадает ни на
минуту**. `latest.json` генерирует `tauri-action`, руками не писать; поле `signature` содержит
содержимое `.sig`, не путь.

### 5.5 macOS

Официальная позиция Tauri: осмысленная кросс-компиляция «is not possible at the current moment».
Единственное экспериментальное направление — Windows **с** Linux/macOS; обратного не существует
в принципе (нужны Apple SDK, `codesign`, `notarytool`, они только на macOS).

Решение — матрица `tauri-apps/tauri-action`, мажор `action-v1.0.0` (2026-06-29):
`macos-latest` с `--target aarch64-apple-darwin` и `--target x86_64-apple-darwin`,
`windows-latest`, при желании `ubuntu-22.04`. Экшен сам создаёт тег и релиз по версии приложения
(`tagName: app-v__VERSION__`) и собирает `latest.json`. Из ломающих изменений мажора: поддержка
Tauri v1 и нестабильных v2 выпилена, `includeRelease`/`includeDebug` убраны (отладочная сборка
теперь через `args: --debug`).

Экономика: репозиторий публичный → стандартные раннеры, включая macOS, бесплатны. Реальная цена
— **$99/год Apple Developer Program** для нотаризации (`APPLE_ID`/`APPLE_PASSWORD`/`APPLE_TEAM_ID`
либо ключ App Store Connect API в секретах). Без нотаризации `.dmg` упрётся в Gatekeeper.

⚠️ mac-сборка 2.2.1 **уже существует** и раздаётся с GitHub Releases (на лендинге `/tools/utmka`
висят ссылки Win 2.2.0 / mac 2.2.1). Прежде чем обещать macOS в 3.0, надо выяснить, как её
выпускали раньше и есть ли платный аккаунт — иначе 3.0 окажется **регрессией по платформам**
относительно замороженного 2.2 (см. §8, вопрос 1).

---

## 6. Этапы работы

Оценки — при условии, что Rust пишется впервые; множитель на неопытность заложен в этапы 5 и 6.

### Этап 1. Тулчейн и живое окно (скелет)

Ставим Rust, заводим `apps/desktop` на Vite, поднимаем в окне Tauri экран генератора поверх
**заглушечного** бэкенда (пустые списки в памяти). Экраны берутся временным алиасом на
`apps/web/components` — вынос в `packages/ui` будет на Этапе 3.

Смысл этапа — прогнать первую холодную сборку **до всякого прикладного кода**, чтобы отделить
грабли среды (линкер, пути с пробелами, Defender, ТСПУ на crates.io) от своих.

**Критерий готовности (руками):** `npx tauri dev` из `apps/desktop` открывает окно; в окне —
каркас «ПРОНИН-ОС» с рамкой, маскотом и статус-баром; экран генератора собирает ссылку, счётчик
длины считает, копирование работает, тема переключается и переживает перезапуск окна; в консоли
окна нет ошибок. Хранилища нет — «быстрый старт» и «сохранить» показывают пустое состояние.
*~0,5 дня, из них до 25 минут — первая сборка, её запускать в фоне и не ждать интерактивно.*

### Этап 2. Контракт оболочки и веб-реализация (Rust не трогаем)

`packages/core/src/backend.ts` + `apps/web/lib/shell.ts`; 20 вызовов `fetch` переезжают из
9 файлов внутрь одного. Роуты `/api/*` не меняются. Заодно — решение по `SettingsPort`,
`removeValue` и `PATCH /api/templates`.

Это единственный шаг, где ошибка видна сразу и дёшева: проверяется существующим прод-приложением.

**Критерий:** `npm test` (149 тестов ядра + 10 сетевого слоя) и `npm run type-check` зелёные;
`grep "fetch(" apps/web/components` даёт ноль; руками на `next dev` проходят 9 сценариев —
создать шаблон, удалить шаблон, импорт файла шаблонов, добавить в историю, удалить запись,
очистить историю, сократить ссылку, проверить редиректы, вход и выход. Поведение не изменилось
ни на пиксель. *~1–1,5 дня.*

### Этап 3. `packages/ui`: вынос экранов, NavPort, saveFile

21 файл из 30 переезжает `git mv` без правок; 37 правок в 9 файлах снимают `next/link` и
`next/navigation`; 93 импорта `'@/...'` закрываются алиасом в двух `tsconfig`, а не переписыванием.
`globals.css` (2460 строк) переезжает **нулём правок** — это и есть главный критерий «дизайн-система
не разъехалась». Tailwind остаётся: utility-классов в проекте ноль, но на его preflight опираются
все 2460 строк собственного CSS; в Vite меняется только плагин (`@tailwindcss/vite` вместо
`@tailwindcss/postcss`).

Тогда же — правки в `Dockerfile` и `.dockerignore` из §1.4.

**Критерий:** `npm run build --workspace @utmka/web` проходит, прод-образ собирается локально
(`docker build`) и стартует; `grep -r "next/" packages/ui` даёт ноль; в окне Tauri работают три
экрана из тех же файлов — генератор, пакетный режим, разбор ссылки. *~1 день.*

### Этап 4. Правила и парсеры — в ядро

`applyHistoryLimit`, `trackValues`, тексты отказов, потолок шаблонов; парсеры JSON/CSV из
`exchange.ts`; один CSV-парсер на весь проект вместо двух.

**Критерий:** новые тесты в `packages/core/test` на потолок истории, наполнение справочника и
разбор обоих форматов CSV (2.2-плоский и 3.0) зелёные; `grep -c "split(" apps/web/lib/exchange.ts`
не находит второго парсера кавычек; веб продолжает работать без изменений в поведении. *~1 день.*

### Этап 5. SQLite и 13 команд на rusqlite

Схема §3.2, миграции §3.4, транзакции §3.5, пул `r2d2_sqlite`, `spawn_blocking`,
`apps/desktop/src/lib/shell.ts` на `invoke`.

**Критерий (в живом окне, не в dev-браузере):** создать шаблон → закрыть приложение → открыть →
шаблон на месте; файл базы лежит по заявленному пути; сохранить ссылку → в справочнике появились
её значения с `uses = 1`; 501-я запись истории вытесняет самую старую (проверить скриптом,
залив 501); дубль имени шаблона даёт текст «Шаблон с таким названием уже есть», а не
`UNIQUE constraint failed`; импорт файла на 200 строк проходит одной транзакцией и не морозит
окно. *~2–3 дня.*

### Этап 6. Сетевые команды: сокращатель и проверка редиректов

`net_shorten` (~15 строк, `clck.ru` в allowlist) и `net_check_redirects` — `reqwest` с
`redirect::Policy::none()`, свой резолвер, внешний таймер. Логика цепочки и проверка имени
**не дублируются**: `assertPublicUrl`/`isPublicHost`/`followRedirects` вызываются из ядра, как
это делает веб.

**Критерий:** сокращение работает в окне; проверка редиректов проходит реальную цепочку и
показывает потерянные метки; таблица SSRF-случаев из `apps/web/test/redirect-fetch.test.ts`
(10 тестов) портирована как `#[test]` и зелёная — числовые записи IP, IPv4-mapped IPv6,
`localtest.me` с публичным именем и приватным адресом, молчащий DNS, коннект в чёрную дыру,
петля хопов. *~2 дня.*

### Этап 7. Импортёр 2.2

Чтение файла второго поколения только на чтение, `PRAGMA table_info`, нормализация дат, засев
справочника, отметка в `meta`.

**Критерий:** на машине владельца диалог первого запуска показывает «31 ссылка, 13 шаблонов»;
после импорта даты и порядок в истории совпадают с тем, что показывает запущенная рядом 2.2.1;
справочник непустой; `utmka.db` версии 2.2 не изменён (сверить размер и mtime до/после);
повторный запуск импорт не предлагает; конфликтующие имена шаблонов перечислены поимённо.
*~1 день.*

### Этап 8. Отличия оболочки и файлы

`caps`-условия вместо `state !== 'member'` в 7 компонентах; `DeviceFrame` получает разделы
пропсами; нативный диалог сохранения вместо `a.download` в 4 местах; CSP в `tauri.conf.json`;
вендоренный Press Start 2P (cyrillic) через `@font-face`; из десктопной точки входа убраны
`LoginScreen`, `VaultGate`, `Metrika` и окно брифа (планка маскота остаётся).

**Критерий:** в окне нет ни одного упоминания кодовой фразы и помощника на LLM; маскот
комментирует ошибки формы; экспорт JSON и CSV кладёт файл через системный диалог и файл
открывается в Excel без каши (BOM и `;` на месте); тур первого визита с `clip-path` и
календарь-поповер на Motion выглядят правильно **в окне**, а не только в Chrome; в панели сети
окна нет запросов наружу, кроме `clck.ru` и проверяемого пользователем адреса. *~1 день.*

### Этап 9. Упаковка и релиз

NSIS `currentUser`, апдейтер, `tauri-action`, `latest.json`, ключ подписи в GitHub Secrets и
Vaultwarden.

**Критерий:** `setup.exe` ставится без запроса UAC в чистом профиле (или в Windows Sandbox),
приложение запускается и видит свою базу; собранная следом версия 3.0.1 подхватывается
апдейтером из GitHub Releases и обновляет установленную на месте. *~1–2 дня.*

### Этап 10 (условный). macOS в матрице CI

Только после ответа на вопрос 1 из §8.

**Критерий:** `.dmg` собирается на `macos-latest` для обеих архитектур и открывается на маке
владельца без обхода Gatekeeper руками. Либо честно фиксируем в §11 ARCHITECTURE, что macOS в
3.0 откладывается, а 2.2.1 для mac остаётся на раздаче. *~0,5 дня работы плюс ожидание Apple.*

---

## 7. Риски и грабли

**Среда и сборка**

| Риск | Смягчение |
|---|---|
| Диск: C: — 9,2 ГБ свободно, D: — 30,3 ГБ. rustup съест 1,5–2,5 ГБ на C:, кэш `~/.cargo/registry` растёт бесконечно, а `target/` у Tauri в debug раздувается до десятков ГБ (известный tauri#2497: «well above 30GB») | `CARGO_HOME`/`RUSTUP_HOME`/`CARGO_TARGET_DIR` на D: **до** установки; в редакторе `"rust-analyzer.cargo.targetDir": "target/analyzer"`, иначе rust-analyzer и `tauri dev` дерутся за папку и сборка встаёт на файловой блокировке; `cargo clean` раз в месяц |
| Путь проекта содержит пробел (`d:/Programmes projects/…`), плюс `MAX_PATH` 260 на глубоких путях `target/` в монорепо | `CARGO_TARGET_DIR` на короткий путь без пробелов снимает обе проблемы разом; `LongPathsEnabled` — вторым слоем |
| Defender сканирует каждый `.o` и `.rlib`: холодная сборка из 10 минут превращается в 25–40 | Исключения на `CARGO_HOME` и `CARGO_TARGET_DIR` (единственное место, где нужен админ) |
| Первая сборка тянет ~500 крейтов и идёт 10–25 минут без признаков жизни; поверх этого ТСПУ-плечо — crates.io отдаётся из-за границы, на машине уже фиксировались потери SYN и хендшейки 2–3 с | Запускать в фоне, не ждать интерактивно. `cargo fetch` прогнать **отдельно** от сборки, чтобы отделить сеть от компиляции. При тормозах — nl-прокси `147.45.156.38` через `HTTPS_PROXY` или `[source.crates-io] replace-with` |
| `@tauri-apps/cli` хойстится в корневой `node_modules/.bin`; появление воркспейса `apps/desktop` ломает Docker-сборку веба (стадия `deps` копирует манифесты только двух воркспейсов, а `npm ci` работает по общему локу) | Ставить CLI только в `apps/desktop`, вызывать `npx` оттуда; **после первой установки пересобрать образ веба локально до пуша** — это тот же класс граблей, что уже записан в `reference_nextjs_docker_deploy_gotchas` |
| Смешивание `rusqlite` и `tauri-plugin-sql`: две редакции `libsqlite3-sys` в одном бинарнике падают на линковке дублирующимися символами | Один путь, зафиксированный в журнале решений. Не брать плагин «только ради миграций» |

**Поведение, которое разъедется молча**

| Риск | Смягчение |
|---|---|
| Удаление `lib/account.ts` «как ненужного»: `QuickStart` и `SaveBar` вернут `null`, `TemplatesScreen`/`HistoryScreen` нарисуют приглашение завести фразу. Пользователь увидит рекламу входа, которого нет | Хук сохранить, питать из адаптера, проверки перевести на `caps.auth` — **до** написания десктопных экранов (§2.8) |
| `trackValues` вызывается внутри `addHistory`, отдельной ручки нет: голый `insert` в Rust оставит справочник пустым без единой ошибки | Контракт в JSDoc + приёмочный случай «сохранил ссылку → значения в справочнике с `uses = 1`» (Этап 5) |
| Потолок 500: в 2.2 это `LIMIT` выборки, в 3.0 — вытеснение при вставке. У пользователя с большой историей импорт молча срежет самое старое | Считать строки до импорта, показывать порог в диалоге и повторять расчёт в отчёте после |
| Даты 2.2 — наивный UTC; `new Date` прочитает их как локальное время и вся история уедет на 4 часа (UTC+4) | Пробел → `T`, дописать `Z`; тест на конкретной строке из живой базы с проверкой порядка сортировки |
| `full_url` в 2.2 закодирован, а `utm_*`-колонки нет; плейсхолдеры `{campaign_id}` обязаны остаться буквальными | Url брать как есть, **не пересобирать через `build`** |
| Уникальность имени шаблона появилась только в 3.0 — импорт 13 шаблонов может частично отвалиться, а в вебе такой сценарий уже даёт невнятное «загружено 8 из 13» | Перечислять пропущенные поимённо либо переименовывать; заодно поправить текст в `TemplatesScreen` |
| Два независимых CSV-парсера (`batch.ts` и `exchange.ts`) с разными правилами разделителя и синонимов заголовков | Свести к одной функции в ядре (Этап 4) — расхождение возможно уже сейчас, до десктопа |
| Импорт файла шлёт по одному запросу на строку в цикле: в вебе это медленно, в десктопе станет 500 отдельных `invoke` и 500 транзакций | `importMany` в контракте с самого начала; в вебе он может остаться циклом **внутри адаптера** |

**SSRF и сеть**

| Риск | Смягчение |
|---|---|
| `redirect-fetch.ts` держится на трёх неочевидных решениях, и переписывающий на Rust увидит «просто http-клиент с 10 хопами»: (1) запрос идёт через `node:http/https` со **своим** `lookup`, потому что undici резолвит имя второй раз при подключении — окно для DNS rebinding, а `guardedLookup` проверяет **все** адреса из ответа DNS, не первый; (2) потолок времени держит **внешний** таймер, а не `req.setTimeout` — тот не тикает на резолве имени и TCP-хендшейке, то есть ровно на фазах, которыми управляет чужой сервер; (3) тело ответа принципиально не читается, `res.destroy()` сразу после заголовков | Портировать **таблицу случаев, а не код**: выписать из 10 тестов и комментариев сценарии и завести их как `#[test]`. `reqwest` с `redirect::Policy::none()` плюс свой resolver/pre-connect-хук, а не «просто http-клиент». Проверку имени и логику цепочки не дублировать — звать из ядра |
| В десктопе SSRF бьёт уже не по серверу владельца, а по локальной сети пользователя (роутер, `127.0.0.1`, NAS) — соблазн снять предохранители «риск же ниже» | Не снимать: ссылку в поле мог прислать кто угодно |

**Окно и файлы**

| Риск | Смягчение |
|---|---|
| CSP исчезает молча: `headers()` при статическом экспорте игнорируется, а в Vite-сборке её нет по определению | `app.security.csp` в `tauri.conf.json`, проверка заголовков в окне |
| `exchange.ts` и три соседа по `a.download`: если скачивание тихо перестанет работать в окне, потеряется функция из списка паритета §4.1 | Явный пункт плана (Этап 8), проверка на живом окне |
| Настройки на `localStorage` вебвью: чистка профиля, переустановка или смена идентификатора сбрасывают тему и режимы | Принимаем как косметическую потерю первой версии; таблица `settings` в схеме заложена сразу |
| Выкидывание Tailwind «за ненадобностью» после того, как выяснилось, что utility-классов ноль | Не выкидывать: на preflight опираются 2460 строк собственного CSS. Менять только плагин сборки |
| WebView2 у пользователей разных версий (у владельца 128); тур с `clip-path` и календарь на Motion могут разъехаться там, где в Chrome всё хорошо | Проверять UI именно в окне Tauri. Playwright здесь не помощник вдвойне: он и так врёт на этом проекте (контент живёт во внутреннем скроллере `.screen-scroll`, `fullPage` снимает только видимую часть), а вебвью он не открывает вовсе |
| Синхронные команды Tauri v2 исполняются в главном потоке — список на 500 строк и импорт подмораживают окно | `spawn_blocking` + пул `r2d2_sqlite` |
| Каталог под базу на чистой машине не существует → `unable to open database file` (код 14) | `create_dir_all` при старте |
| Бэкап копированием при включённом WAL отдаёт неполную базу | `VACUUM INTO` либо закрытие соединения |

---

## 8. Открытые вопросы к владельцу

1. **macOS в объёме 3.0 — да или нет?** mac-сборка 2.2.1 существует и раздаётся с лендинга.
   Как её выпускали (своя машина? чужая? вручную?) и есть ли действующий Apple Developer Program
   ($99/год)? Без нотаризации `.dmg` упирается в Gatekeeper. Ответ определяет, будет ли 3.0
   регрессией по платформам и нужен ли Этап 10.
2. **Редактирование шаблона.** В 2.2 оно было, в вебе 3.0 его нет: `PATCH /api/templates`
   написан, но из интерфейса не вызывается ни разу. Это дыра в паритете. Чиним в обеих оболочках,
   чиним только в десктопе или сносим ручку?
3. **Сетевые функции в офлайн-приложении.** Сокращатель ходит на `clck.ru`, проверка редиректов —
   на любой адрес пользователя. Продукт при этом позиционируется как офлайн-версия. Оставляем обе
   как есть, или прячем за настройку «разрешить обращения в интернет» (выключена по умолчанию)?
4. **Подпись Windows.** Живём со SmartScreen, как 2.2.1, или покупаем сертификат? OV дешевле, но
   предупреждение держится, пока копится репутация; EV даёт репутацию сразу и дороже; есть
   облачный Azure Artifact Signing.
5. **Установщик и WebView2.** Подтвердить NSIS без MSI и выбрать режим рантайма:
   `downloadBootstrapper` (мелкий установщик, нужен интернет) или `embedBootstrapper` (+1,8 МБ,
   ставится офлайн). Второе — если офлайн-установка правда заявленный сценарий.
6. **Ключ апдейтера.** Подтвердить схему хранения: GitHub Actions Secrets + личная копия в
   Vaultwarden, в дерево проекта не попадает. Репозиторий публичный.
7. **Версии и ветки.** Десктоп 3.0 выпускается тегом `app-v3.0.0` из ветки `v3.0`, а в `main`
   лежит 2.2.1. Когда сливаем и что происходит со ссылками на 2.2 на лендинге `/tools/utmka`
   (Win 2.2.0 / mac 2.2.1) — заменяем или оставляем обе линии?
8. **Диалог импорта 2.2.** Показываем при первом запуске автоматически или прячем в настройки?
   И что делаем при конфликте имён шаблонов — переименовывать молча (`имя (2)`) или спрашивать?
9. **Судьба `SettingsPort`** в контракте ядра: дописать реализацию поверх таблицы `settings`
   вторым заходом (рекомендация) или удалить порт из `repository.ts` как мёртвую абстракцию?
   Тот же вопрос по `removeValue`, которого нет в порту, но есть в роуте.
10. **Окно помощника в десктопе.** Планка маскота с репликами на правилах остаётся (это ядро,
    не LLM). Подтвердить, что кнопка «помощник» и окно брифа в десктопе просто отсутствуют, а не
    показывают заглушку «доступно в веб-версии».
