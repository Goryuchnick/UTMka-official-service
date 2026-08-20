'use client'

/**
 * GeneratorScreen — главный экран инструмента.
 *
 * Два вида одного генератора (ARCHITECTURE §4.2): простой — пошаговый,
 * вопросами на человеческом языке; расширенный — все поля сразу, как в 2.2.
 * Модель данных общая, поэтому переключение ничего не теряет.
 *
 * Черновик — единственное состояние ссылки, и это правило. Правка готового
 * результата разбирается обратно в поля (`draftFromUrl`), содержание и
 * ключевое слово простого режима — те же поля, что в расширенном. Второй
 * источник правды («ссылка отдельно, форма отдельно») разошёлся бы с формой
 * на первом нажатии, и в шаблон уехало бы не то, что видно на экране.
 *
 * Вся логика — из `@utmka/core`: сборка, валидация, нормализация, пресеты.
 * Экран только отображает; правила здесь не дублируются.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyPreset,
  buildUrl,
  draftFromUrl,
  hasAnyParam,
  matchPreset,
  normalizeDraft,
  UTM_KEYS,
  validateDraft,
  validateValue,
  type LinkDraft,
  type Preset,
  type UtmKey,
} from '@utmka/core'

import { PixelIcon } from '../PixelIcon'
import { readBootstrapDraft } from '../../lib/draft-bootstrap'
import { useSetMascotLine, type MascotTone } from '../../lib/mascot'
import { useGeneratorMode } from '../../lib/mode'
import { IssueList } from './IssueList'
import { ValueField } from './ValueField'
import { PresetTiles } from './PresetTiles'
import { ResultCard } from './ResultCard'
import { SaveBar } from './SaveBar'
import { QuickStart } from './QuickStart'
import { sayAbout } from '../../lib/mascot-lines'

const EMPTY: LinkDraft = { baseUrl: '', params: {} }

/**
 * Заготовка из адресной строки. Так работают кнопки «в генератор» в истории и
 * шаблонах, и так можно кинуть коллеге готовую ссылку-заготовку:
 * `/?url=site.ru&source=vk&medium=social`.
 */
function draftFromSearch(search: URLSearchParams): LinkDraft | null {
  const params: LinkDraft['params'] = {}
  for (const key of UTM_KEYS) {
    const value = search.get(key)
    if (value) params[key] = value
  }
  const baseUrl = search.get('url') ?? ''
  if (!baseUrl && Object.keys(params).length === 0) return null
  return { baseUrl, params }
}

/**
 * Заготовка, снятая с адресной строки бутстрапом (`lib/draft-bootstrap.ts`).
 * Основной путь: к моменту гидрации адрес уже вычищен, и `useSearchParams`
 * наших ключей не увидит — значения ждут в `window.__utmkaDraft`.
 */
function draftFromBootstrap(): LinkDraft | null {
  const raw = readBootstrapDraft()
  if (!raw) return null

  const params: LinkDraft['params'] = {}
  for (const key of UTM_KEYS) {
    const value = raw[key]
    if (value) params[key] = value
  }
  const baseUrl = raw.url ?? ''
  if (!baseUrl && Object.keys(params).length === 0) return null
  return { baseUrl, params }
}

/** Реплики помощника. Свои, не копия сайта и не копия курса. */
const LINES = {
  start: 'Соберём ссылку. Начнём с адреса — куда ведём людей.',
  platform: 'Теперь площадка. Нажмите плитку — источник и канал заполню сам.',
  campaign: 'Назовите кампанию, чтобы через полгода понять, что это был за запуск.',
  done: 'Готово. Фигурные скобки так и должны выглядеть — площадка подставит значения сама.',
  broken: 'Тут есть что поправить: ниже написал, что именно сломается в отчёте.',
  pro: 'Все поля перед вами. Проверяю на ходу и говорю, если что-то разъедется.',
} as const

type Step = 1 | 2 | 3 | 4

interface GeneratorScreenProps {
  /**
   * Площадка, метки которой подставлены заранее. Так генератор открывается на
   * посадочных страницах вида `/yandex-direct`: человек пришёл по запросу про
   * конкретную площадку, и переспрашивать её плиткой незачем.
   *
   * Заготовка из адреса приоритетнее: ссылка «в генератор» из истории несёт
   * осознанный выбор пользователя, а пресет — лишь умолчание страницы.
   */
  preset?: Preset
}

export function GeneratorScreen({ preset }: GeneratorScreenProps = {}) {
  const { mode: savedMode, setMode } = useGeneratorMode()

  /* Первый кадр не зависит от адресной строки, и это принципиально.
     `useSearchParams()` выводит компонент из статического рендера: главная
     уезжала в динамику целиком, а поисковику вместо генератора доставалась
     заглушка Suspense — 291 символ на всю страницу. Теперь сервер рисует
     форму, а заготовка из адреса приезжает эффектом ниже. */
  const [draft, setDraft] = useState<LinkDraft>(() =>
    preset ? applyPreset(EMPTY, preset) : EMPTY,
  )
  const [step, setStep] = useState<Step>(1)
  const [forced, setForced] = useState<'simple' | 'pro' | null>(null)

  /* Заготовка из адреса — и уборка адреса за собой.
     Оба пути ведут сюда: при полной загрузке параметры уже сняты синхронным
     скриптом в `<head>` и ждут в `window.__utmkaDraft` (см. `draft-bootstrap`),
     при переходе внутри приложения — лежат в строке запроса, потому что
     скрипт в `<head>` при клиентской навигации не выполняется.

     `history.replaceState`, а не `router.replace`: адрес меняется, состояние
     React и скролл не трогаются. */
  useEffect(() => {
    const current = new URL(window.location.href)

    /* ⚠️ Параметры лежат в разных местах в разных оболочках. В вебе это
       обычная строка запроса, а в окне роутер хеш-овый, и переход «подставить
       в генератор» даёт адрес вида `#/?url=…&source=…` — там `search` пуст, и
       чтение только из него молча открывало пустую форму. */
    const hashQuery = current.hash.indexOf('?')
    const inHash = hashQuery >= 0
    const search = inHash
      ? new URLSearchParams(current.hash.slice(hashQuery + 1))
      : current.searchParams

    const mode = search.get('mode')
    if (mode === 'pro' || mode === 'simple') setForced(mode)

    const incoming = draftFromBootstrap() ?? draftFromSearch(search)
    if (incoming) {
      setDraft(incoming)
      setStep(4)
    }

    let cleaned = false
    for (const key of ['url', ...UTM_KEYS]) {
      if (search.has(key)) {
        search.delete(key)
        cleaned = true
      }
    }
    if (cleaned) {
      // Убираем ровно оттуда, откуда взяли, — иначе адрес остаётся с метками.
      const tail = search.toString()
      const next = inHash
        ? `${current.pathname}${current.search}${current.hash.slice(0, hashQuery)}${tail ? `?${tail}` : ''}`
        : `${current.pathname}${tail ? `?${tail}` : ''}${current.hash}`
      window.history.replaceState(null, '', next)
    }
  }, [])

  // `?mode=` перебивает сохранённый выбор — чтобы можно было прислать ссылку
  // «открой сразу в простом» (ARCHITECTURE §4.2).
  const mode = forced ?? savedMode

  const issues = useMemo(() => validateDraft(draft), [draft])
  const url = useMemo(() => buildUrl(draft), [draft])
  const activePreset = useMemo(() => matchPreset(draft.params), [draft.params])
  const blocking = useMemo(() => issues.filter((issue) => issue.level !== 'info'), [issues])
  const ready = draft.baseUrl.trim() !== '' && hasAnyParam(draft.params)

  const setBaseUrl = useCallback((baseUrl: string) => {
    setDraft((prev) => ({ ...prev, baseUrl }))
  }, [])

  const setParam = useCallback((key: UtmKey, value: string) => {
    setDraft((prev) => ({ ...prev, params: { ...prev.params, [key]: value } }))
  }, [])

  const pickPreset = useCallback((preset: Preset) => {
    setDraft((prev) => applyPreset(prev, preset))
    setStep(3)
  }, [])

  const tidy = useCallback(() => {
    setDraft((prev) => normalizeDraft(prev).draft)
    sayAbout('fixed')
  }, [])

  /* Правка готовой ссылки. Разбираем текст обратно в поля формы, а не держим
     его отдельной строкой: иначе в шаблон и в историю уехало бы не то, что
     человек только что видел на экране, — а разошлись бы они на первом же
     нажатии в форме. */
  const applyUrl = useCallback((raw: string) => {
    setDraft(draftFromUrl(raw))
  }, [])

  const reset = useCallback(() => {
    setDraft(EMPTY)
    setStep(1)
  }, [])

  const line = (() => {
    if (mode === 'pro') return blocking.length > 0 ? LINES.broken : LINES.pro
    if (step === 1) return LINES.start
    if (step === 2) return LINES.platform
    if (step === 3) return LINES.campaign
    return blocking.length > 0 ? LINES.broken : LINES.done
  })()

  // Настроение: поломанное — удивление, готовая ссылка — кивок.
  const tone: MascotTone =
    blocking.length > 0 ? 'alert' : mode === 'simple' && step === 4 && url ? 'done' : 'neutral'

  useSetMascotLine(line, tone)

  return (
    <div className="screen-scroll">
      <div className="result-row">
        <div
          role="group"
          aria-label="Режим генератора"
          style={{ display: 'inline-flex', gap: 6 }}
        >
          <button
            type="button"
            className="chip"
            aria-pressed={mode === 'simple'}
            onClick={() => setMode('simple')}
            style={mode === 'simple' ? { color: 'var(--hv2-fg)', borderColor: 'var(--hv2-primary)' } : undefined}
          >
            Просто
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={mode === 'pro'}
            onClick={() => setMode('pro')}
            style={mode === 'pro' ? { color: 'var(--hv2-fg)', borderColor: 'var(--hv2-primary)' } : undefined}
          >
            Эксперт
          </button>
        </div>
        <span className="hint">
          {mode === 'simple'
            ? 'Эксперт — все пять полей сразу, как в приложении для ПК'
            : 'Просто — четыре вопроса вместо пяти полей'}
        </span>
      </div>

      <QuickStart
        onPick={(next) => {
          /* Шаблон — это набор МЕТОК, адрес в нём может отсутствовать: в 2.2
             базового адреса у шаблона не было вовсе, да и в 3.0 его сохраняют
             не всегда. Поэтому пустой адрес шаблона не затирает введённый —
             иначе нажатие на «недавний шаблон» стирало набранную ссылку и
             экран говорил «не указан адрес» на только что заполненном поле. */
          setDraft((prev) => ({
            baseUrl: next.baseUrl.trim() || prev.baseUrl,
            params: hasAnyParam(next.params) ? next.params : prev.params,
          }))
          /* На итог переводим, только если ссылке есть из чего собраться;
             иначе возвращаем к первому вопросу — там, где адрес и вводят. */
          setStep(next.baseUrl.trim() || draft.baseUrl.trim() ? 4 : 1)
          sayAbout('applyTemplate')
        }}
      />

      {mode === 'simple' ? (
        <SimpleMode
          draft={draft}
          step={step}
          url={url}
          issues={blocking}
          activePresetId={activePreset?.id}
          explain={activePreset?.explain}
          onStep={setStep}
          onBaseUrl={setBaseUrl}
          onParam={setParam}
          onPreset={pickPreset}
          onTidy={tidy}
          onApplyUrl={applyUrl}
        />
      ) : (
        <ProMode
          draft={draft}
          url={url}
          ready={ready}
          onBaseUrl={setBaseUrl}
          onParam={setParam}
          onTidy={tidy}
          onReset={reset}
          onApplyUrl={applyUrl}
        />
      )}
    </div>
  )
}

/* ─────────────────────────── простой режим ─────────────────────────── */

interface SimpleModeProps {
  draft: LinkDraft
  step: Step
  url: string
  issues: ReturnType<typeof validateDraft>
  activePresetId: string | undefined
  explain: string | undefined
  onStep: (step: Step) => void
  onBaseUrl: (value: string) => void
  onParam: (key: UtmKey, value: string) => void
  onPreset: (preset: Preset) => void
  onTidy: () => void
  onApplyUrl: (url: string) => void
}

function SimpleMode({
  draft,
  step,
  url,
  issues,
  activePresetId,
  explain,
  onStep,
  onBaseUrl,
  onParam,
  onPreset,
  onTidy,
  onApplyUrl,
}: SimpleModeProps) {
  /* Содержание и ключевое слово — по желанию, но спрятать их насовсем нельзя:
     пресеты площадок сами кладут туда подстановки ({ad_id} у Директа), и
     невидимое заполненное поле — худший вид сюрприза. Поэтому блок
     раскрывается либо кнопкой, либо тем, что в нём уже что-то лежит.

     ⚠️ Любая правка этих полей закрепляет блок раскрытым. Иначе очистка
     подставленного пресетом значения схлопывала блок прямо под курсором:
     условие «показан, потому что заполнен» переставало выполняться ровно тем
     действием, которым человек его и опустошал. */
  const [extrasOpen, setExtrasOpen] = useState(false)
  const filledExtras = Boolean((draft.params.content ?? '').trim() || (draft.params.term ?? '').trim())
  const showExtras = extrasOpen || filledExtras

  const setExtra = (key: 'content' | 'term', value: string) => {
    setExtrasOpen(true)
    onParam(key, value)
  }
  const answers: Record<Step, string> = {
    1: draft.baseUrl.replace(/^https?:\/\//, ''),
    2: activePresetId ? (draft.params.source ?? '') : '',
    3: draft.params.campaign ?? '',
    4: '',
  }

  const titles: Record<Step, string> = {
    1: 'Куда ведёт ссылка?',
    2: 'Откуда пойдут люди?',
    3: 'Как назовём кампанию?',
    4: 'Ссылка готова',
  }

  const shortTitles: Record<Step, string> = {
    1: 'Куда ведёт ссылка',
    2: 'Откуда пойдут люди',
    3: 'Название кампании',
    4: 'Готово',
  }

  const chipTone: Record<Step, string> = {
    1: 'qchip',
    2: 'qchip qchip--magenta',
    3: 'qchip qchip--teal',
    4: 'qchip',
  }

  const steps: Step[] = [1, 2, 3, 4]

  return (
    <div className="steps">
      {steps.map((current) => {
        if (current !== step) {
          const passed = current < step
          return (
            <div key={current} className="step" data-state={passed ? 'done' : 'todo'}>
              <button type="button" className="step-done" onClick={() => onStep(current)}>
                <span className={passed ? 'qchip qchip--done' : chipTone[current]}>
                  {passed ? <PixelIcon name="check" /> : current}
                </span>
                <span className="step-name">{shortTitles[current]}</span>
                {answers[current] ? <b>{answers[current]}</b> : null}
              </button>
            </div>
          )
        }

        return (
          <div key={current} className="step" data-state="now">
            <div className="glass">
              <div className="qhead">
                <span className={chipTone[current]}>{current}</span>
                <span className={`qtitle ${current === 2 ? 'qtitle--magenta' : current === 3 ? 'qtitle--teal' : 'qtitle--amber'}`}>{titles[current]}</span>
              </div>

              {current === 1 && (
                <>
                  <div className="input">
                    <span className="scheme">https://</span>
                    <input
                      type="text"
                      className="ym-disable-keys ym-hide-content"
                      value={draft.baseUrl.replace(/^https?:\/\//, '')}
                      onChange={(event) => onBaseUrl(event.target.value)}
                      placeholder="test.ru/page"
                      aria-label="Адрес страницы"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <p className="hint">Схему допишем сами — без неё ссылка не кликается в письмах.</p>
                  <div className="result-row">
                    <button
                      type="button"
                      className="btn btn--main"
                      disabled={draft.baseUrl.trim() === ''}
                      onClick={() => onStep(2)}
                    >
                      Дальше
                    </button>
                  </div>
                </>
              )}

              {current === 2 && (
                <>
                  <PresetTiles activeId={activePresetId} onPick={onPreset} />
                  {explain ? <p className="explain">{explain}</p> : null}
                  {/* Плитка сама ведёт дальше, но вернувшемуся на этот шаг
                      идти было нечем: единственным способом уйти вперёд было
                      нажать площадку ещё раз. */}
                  {(draft.params.source ?? '').trim() ? (
                    <div className="result-row">
                      <button type="button" className="btn btn--main" onClick={() => onStep(3)}>
                        Дальше
                      </button>
                    </div>
                  ) : null}
                </>
              )}

              {current === 3 && (
                <>
                  <ValueField
                    field="campaign"
                    value={draft.params.campaign ?? ''}
                    onChange={(value) => onParam('campaign', value)}
                    source={draft.params.source}
                    bare
                  />
                  <IssueList issues={validateValue('campaign', draft.params.campaign ?? '')} onFix={onTidy} />
                  {/* Про поведение даты рассказывает сам календарь — здесь не дублируем. */}
                  <p className="hint">
                    Латиницей, без пробелов. Номер кампании площадка подставит сама — подстановки
                    лежат в поле под кнопкой с угловыми скобками.
                  </p>

                  {showExtras ? (
                    <div className="substep">
                      <span className="field-label">Уточнения — по желанию</span>
                      <div className="grid2">
                        <ValueField
                          field="content"
                          value={draft.params.content ?? ''}
                          onChange={(value) => setExtra('content', value)}
                          source={draft.params.source}
                        />
                        <ValueField
                          field="term"
                          value={draft.params.term ?? ''}
                          onChange={(value) => setExtra('term', value)}
                          source={draft.params.source}
                        />
                      </div>
                      <p className="hint">
                        Содержание (utm_content) различает креативы одной кампании, ключевое слово
                        (utm_term) — фразу, по которой пришли. Без них отчёт соберётся, но внутри
                        кампании всё сольётся в одну строку.
                      </p>
                    </div>
                  ) : (
                    <div className="result-row">
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => setExtrasOpen(true)}
                      >
                        <PixelIcon name="add" />
                        Содержание и ключевое слово
                      </button>
                    </div>
                  )}

                  <div className="result-row">
                    <button type="button" className="btn btn--main" onClick={() => onStep(4)}>
                      Дальше
                    </button>
                  </div>
                </>
              )}

              {current === 4 && (
                <>
                  {url ? (
                    <ResultCard url={url} onApply={onApplyUrl} />
                  ) : (
                    <p className="empty">Заполните адрес — и ссылка появится здесь.</p>
                  )}
                  <IssueList issues={issues} onFix={onTidy} />
                  {url ? <SaveBar draft={draft} url={url} /> : null}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── расширенный режим ─────────────────────────── */

interface ProModeProps {
  draft: LinkDraft
  url: string
  ready: boolean
  onBaseUrl: (value: string) => void
  onParam: (key: UtmKey, value: string) => void
  onTidy: () => void
  onReset: () => void
  onApplyUrl: (url: string) => void
}

function ProMode({
  draft,
  url,
  ready,
  onBaseUrl,
  onParam,
  onTidy,
  onReset,
  onApplyUrl,
}: ProModeProps) {
  const issues = useMemo(() => validateDraft(draft), [draft])
  const blocking = issues.filter((issue) => issue.level !== 'info')

  return (
    <div className="pro-cols">
      <div className="glass">
        <div className="qhead">
          <span className="qchip">
            <PixelIcon name="link" />
          </span>
          <span className="qtitle qtitle--amber">Параметры ссылки</span>
        </div>

        <div className="field">
          <span className="field-label">Адрес страницы</span>
          <div className="input">
            <span className="scheme">https://</span>
            <input
              type="text"
              className="ym-disable-keys ym-hide-content"
              value={draft.baseUrl.replace(/^https?:\/\//, '')}
              onChange={(event) => onBaseUrl(event.target.value)}
              placeholder="test.ru/page"
              aria-label="Адрес страницы"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="grid2">
          {(['source', 'medium'] as const).map((key) => (
            <ValueField
              key={key}
              field={key}
              value={draft.params[key] ?? ''}
              onChange={(value) => onParam(key, value)}
            />
          ))}
        </div>

        <ValueField
          field="campaign"
          value={draft.params.campaign ?? ''}
          onChange={(value) => onParam('campaign', value)}
          source={draft.params.source}
        />

        <div className="grid2">
          {(['content', 'term'] as const).map((key) => (
            <ValueField
              key={key}
              field={key}
              value={draft.params[key] ?? ''}
              onChange={(value) => onParam(key, value)}
              source={draft.params.source}
            />
          ))}
        </div>

        <div className="result-row">
          <button type="button" className="btn btn--sm" onClick={onTidy}>
            <PixelIcon name="wand" />
            Привести в порядок
          </button>
          <button type="button" className="btn btn--sm" onClick={onReset}>
            <PixelIcon name="trash" />
            Очистить
          </button>
        </div>
      </div>

      <div className="glass">
        {ready && url ? (
          <>
            <ResultCard url={url} onApply={onApplyUrl} />
            <SaveBar draft={draft} url={url} />
          </>
        ) : null}

        <div className="qhead">
          <span className={blocking.length > 0 ? 'qchip qchip--magenta' : 'qchip qchip--done'}>
            {blocking.length > 0 ? '!' : <PixelIcon name="check" />}
          </span>
          <span className="qtitle" style={{ fontSize: 16 }}>
            {blocking.length > 0 ? 'Что сломается в отчёте' : 'Замечаний нет'}
          </span>
        </div>

        {issues.length > 0 ? (
          <IssueList issues={issues} onFix={onTidy} />
        ) : (
          <p className="empty">
            {ready
              ? 'Метки корректны: регистр, разделители и тип трафика на месте.'
              : 'Заполните адрес и хотя бы источник с каналом.'}
          </p>
        )}
      </div>
    </div>
  )
}

export { UTM_KEYS }
