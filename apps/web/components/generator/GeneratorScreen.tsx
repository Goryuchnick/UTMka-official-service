'use client'

/**
 * GeneratorScreen — главный экран инструмента.
 *
 * Два вида одного генератора (ARCHITECTURE §4.2): простой — пошаговый,
 * вопросами на человеческом языке; расширенный — все поля сразу, как в 2.2.
 * Модель данных общая, поэтому переключение ничего не теряет.
 *
 * Вся логика — из `@utmka/core`: сборка, валидация, нормализация, пресеты.
 * Экран только отображает; правила здесь не дублируются.
 */

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation'
import {
  applyPreset,
  buildUrl,
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

import { PixelIcon } from '@/components/PixelIcon'
import { useSetMascotLine, type MascotTone } from '@/lib/mascot'
import { useGeneratorMode } from '@/lib/mode'
import { IssueList } from './IssueList'
import { ValueField } from './ValueField'
import { PresetTiles } from './PresetTiles'
import { ResultCard } from './ResultCard'
import { SaveBar } from './SaveBar'

const EMPTY: LinkDraft = { baseUrl: '', params: {} }

/**
 * Заготовка из адресной строки. Так работают кнопки «в генератор» в истории и
 * шаблонах, и так можно кинуть коллеге готовую ссылку-заготовку:
 * `/?url=site.ru&source=vk&medium=social`.
 */
function draftFromSearch(search: ReadonlyURLSearchParams): LinkDraft | null {
  const params: LinkDraft['params'] = {}
  for (const key of UTM_KEYS) {
    const value = search.get(key)
    if (value) params[key] = value
  }
  const baseUrl = search.get('url') ?? ''
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

export function GeneratorScreen() {
  const search = useSearchParams()
  const { mode: savedMode, setMode } = useGeneratorMode()

  // Заготовку берём один раз при монтировании: дальше это обычная форма,
  // и перезатирать введённое при смене адреса было бы враньём.
  const [draft, setDraft] = useState<LinkDraft>(() => draftFromSearch(search) ?? EMPTY)
  const [step, setStep] = useState<Step>(() => (draftFromSearch(search) ? 4 : 1))

  // `?mode=` перебивает сохранённый выбор — чтобы можно было прислать ссылку
  // «открой сразу в простом» (ARCHITECTURE §4.2).
  const forced = search.get('mode')
  const mode = forced === 'pro' || forced === 'simple' ? forced : savedMode

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
}: SimpleModeProps) {
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
                      value={draft.baseUrl.replace(/^https?:\/\//, '')}
                      onChange={(event) => onBaseUrl(event.target.value)}
                      placeholder="studiowelcome.ru/rostov"
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
                </>
              )}

              {current === 3 && (
                <>
                  <ValueField
                    field="campaign"
                    value={draft.params.campaign ?? ''}
                    onChange={(value) => onParam('campaign', value)}
                    bare
                  />
                  <IssueList issues={validateValue('campaign', draft.params.campaign ?? '')} onFix={onTidy} />
                  {/* Про поведение даты рассказывает сам календарь — здесь не дублируем. */}
                  <p className="hint">Латиницей, без пробелов.</p>
                  <div className="result-row">
                    <button type="button" className="btn btn--main" onClick={() => onStep(4)}>
                      Дальше
                    </button>
                  </div>
                </>
              )}

              {current === 4 && (
                <>
                  {url ? <ResultCard url={url} /> : <p className="empty">Заполните адрес — и ссылка появится здесь.</p>}
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
}

function ProMode({ draft, url, ready, onBaseUrl, onParam, onTidy, onReset }: ProModeProps) {
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
              value={draft.baseUrl.replace(/^https?:\/\//, '')}
              onChange={(event) => onBaseUrl(event.target.value)}
              placeholder="studiowelcome.ru/rostov"
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
        />

        <div className="grid2">
          {(['content', 'term'] as const).map((key) => (
            <ValueField
              key={key}
              field={key}
              value={draft.params[key] ?? ''}
              onChange={(value) => onParam(key, value)}
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
            <ResultCard url={url} />
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
