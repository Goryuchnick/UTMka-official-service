'use client'

/**
 * Шаблоны и справочник значений.
 *
 * Шаблоны — паритет с 2.2: имя, тег с цветом из палитры, поиск, три вида
 * отображения, импорт и выгрузка JSON/CSV. Справочник — новое в 3.0: он
 * показывает, чем вы уже пользовались, и главное — ловит расщепления
 * (`yandex` и `Yandex` в одном отчёте разъедутся на две строки).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  backendMessage,
  detectSplits,
  isAuthError,
  parseTemplatesCsv,
  parseTemplatesJson,
  templatesToCsv,
  templatesToJson,
  UTM_KEYS,
  type DictEntry,
  type SplitGroup,
  type Template,
  type UtmKey,
} from '@utmka/core'

import { PixelIcon } from './PixelIcon'
import { DictionaryForm } from './DictionaryForm'
import { TemplateForm } from './TemplateForm'
import { EmptyNote, ViewSwitch } from './ViewSwitch'
import { VaultGate } from './VaultGate'
import { useAccount } from '../lib/account'
import { backend, useNav } from '../shell'
import { useSetMascotLine } from '../lib/mascot'
import { useViewMode } from '../lib/view'
import { exportCsv, exportJson } from '../lib/exchange'
import { sayAbout } from '../lib/mascot-lines'

/** Палитра тегов — восемь цветов, как в 2.2. Значения из токенов «ПРОНИН-ОС». */
export const TAG_COLORS: readonly string[] = [
  'var(--hv2-primary)',
  'var(--hv2-course)',
  'var(--hv2-teal)',
  'var(--hv2-success)',
  'var(--hv2-info)',
  'var(--hv2-destructive)',
  'var(--hv2-muted)',
  'var(--hv2-subtle)',
]

const KIND_LABEL: Record<UtmKey, string> = {
  source: 'Источник',
  medium: 'Канал',
  campaign: 'Кампания',
  content: 'Содержание',
  term: 'Ключевое слово',
}

type Tab = 'templates' | 'dictionary'

interface Library {
  items: Template[]
  dict: DictEntry[]
  error: string
}

/**
 * Чтение вынесено из компонента: эффект только подписывается на внешний мир и
 * кладёт результат в колбэке — так React не получает каскад рендеров.
 */
async function fetchLibrary(): Promise<Library> {
  try {
    const [items, dict] = await Promise.all([
      backend.templates.list(),
      backend.dictionary.list(),
    ])
    return { items, dict, error: '' }
  } catch (error) {
    // «Фразы нет» — не ошибка чтения: об этом говорит отдельный экран.
    return { items: [], dict: [], error: isAuthError(error) ? '' : backendMessage(error) }
  }
}

export function TemplatesScreen() {
  const nav = useNav()
  const { state } = useAccount()
  const { view, setView } = useViewMode('templates')

  const [tab, setTab] = useState<Tab>('templates')
  // null — «ещё не читали»: отдельный флаг загрузки потребовал бы setState
  // прямо в эффекте, а это лишний каскад рендеров.
  const [items, setItems] = useState<Template[] | null>(null)
  const [dict, setDict] = useState<DictEntry[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  /* Итог импорта живёт отдельно от ошибки чтения: сразу после импорта экран
     перечитывает библиотеку и кладёт в `error` пустую строку — общий стейт
     затирал бы отчёт о непринятых строках раньше, чем его успевали прочесть. */
  const [report, setReport] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  /** Счётчик перечитываний: растёт после импорта, эффект на него подписан. */
  const [reload, setReload] = useState(0)

  const busy = state === 'unknown' || (state === 'member' && items === null)
  const list = useMemo(() => items ?? [], [items])

  useSetMascotLine(
    state === 'member'
      ? 'Шаблон — это не «удобно», это одинаковые метки во всех запусках.'
      : 'Шаблоны живут за фразой. Без неё набор меток придётся вбивать каждый раз заново.',
    state === 'member' ? 'neutral' : 'alert',
  )

  useEffect(() => {
    if (state !== 'member') return undefined

    let alive = true
    void fetchLibrary().then((result) => {
      if (!alive) return
      setItems(result.items)
      setDict(result.dict)
      setError(result.error)
    })
    return () => {
      alive = false
    }
  }, [state, reload])

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return list
    return list.filter((item) =>
      [item.name, item.tagName ?? '', ...Object.values(item.params ?? {})]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [list, query])

  /** Расщепления — то, ради чего справочник и нужен. Логика в ядре. */
  const splits = useMemo(() => detectSplits(dict), [dict])

  const drop = useCallback(async (id: string) => {
    setItems((prev) => (prev ?? []).filter((item) => item.id !== id))
    await backend.templates.remove(id)
    sayAbout('removed')
  }, [])

  const apply = useCallback(
    (template: Template) => {
      const params = new URLSearchParams({ url: template.baseUrl ?? '' })
      for (const [key, value] of Object.entries(template.params ?? {})) {
        if (value) params.set(key, value)
      }
      nav.go(`/?${params.toString()}`)
    },
    [nav],
  )

  const merge = useCallback(
    async (kind: UtmKey, alias: string, canonical: string) => {
      setDict((prev) =>
        prev.map((entry) =>
          entry.kind === kind && entry.value === alias ? { ...entry, canonical } : entry,
        ),
      )
      await backend.dictionary.merge(kind, alias, canonical)
      sayAbout('merged')
    },
    [],
  )

  const importFile = useCallback(
    async (file: File) => {
      const text = await file.text()
      const parsed = file.name.toLowerCase().endsWith('.csv')
        ? parseTemplatesCsv(text)
        : parseTemplatesJson(text)

      if (parsed.length === 0) {
        setReport('В файле не нашлось ни одного шаблона')
        return
      }

      /* Цикл по строкам живёт внутри адаптера: в вебе это по-прежнему запрос на
         строку, в десктопе — одна транзакция. Экран об этом не знает. */
      try {
        const { added, skipped } = await backend.templates.importMany(parsed)
        setReport(
          skipped.length === 0
            ? `Загружено ${added} из ${parsed.length}.`
            : `Загружено ${added} из ${parsed.length}. Не легли: ${skipped.join('; ')}`,
        )
      } catch (error) {
        setReport(backendMessage(error))
      }
      setReload((value) => value + 1)
      sayAbout('imported')
    },
    [],
  )

  if (state === 'guest') {
    return (
      <div className="screen-scroll">
        <VaultGate
          title="Шаблоны и справочник"
          what="Шаблон запоминает набор меток целиком — с тегом и цветом. Справочник копит значения, которыми вы уже пользовались, и показывает, где одно и то же написано по-разному."
        />
      </div>
    )
  }

  return (
    <div className="screen-scroll">
      <div className="glass">
        <div className="qhead">
          <span className="qchip">
            <PixelIcon name="star" />
          </span>
          <span className="qtitle qtitle--amber">Библиотека</span>
        </div>

        <div className="chips" role="group" aria-label="Раздел библиотеки">
          <button
            type="button"
            className="chip"
            aria-pressed={tab === 'templates'}
            onClick={() => setTab('templates')}
            style={tab === 'templates' ? { color: 'var(--hv2-fg)', borderColor: 'var(--hv2-primary)' } : undefined}
          >
            Шаблоны
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={tab === 'dictionary'}
            onClick={() => setTab('dictionary')}
            style={tab === 'dictionary' ? { color: 'var(--hv2-fg)', borderColor: 'var(--hv2-primary)' } : undefined}
          >
            Справочник
          </button>
        </div>

        {tab === 'templates' ? (
          <>
            <div className="field">
              <div className="input">
                <PixelIcon name="search" />
                <input
                  type="text"
                  className="ym-disable-keys ym-hide-content"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск по названию, тегу и меткам"
                  aria-label="Поиск по шаблонам"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="result-row">
              <ViewSwitch view={view} onChange={setView} />
              <span className="result-len">{list.length} из 500</span>
            </div>

            <div className="result-row">
              <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
                <PixelIcon name="save" />
                Загрузить файл
              </button>
              <button
                type="button"
                className="btn btn--sm"
                disabled={list.length === 0}
                onClick={() => {
                  void exportJson('utmka-templates', templatesToJson(list))
                  sayAbout('exported')
                }}
              >
                <PixelIcon name="save" />
                Выгрузить JSON
              </button>
              <button
                type="button"
                className="btn btn--sm"
                disabled={list.length === 0}
                onClick={() => {
                  void exportCsv('utmka-templates', templatesToCsv(list))
                  sayAbout('exported')
                }}
              >
                <PixelIcon name="save" />
                Выгрузить CSV
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void importFile(file)
                  event.target.value = ''
                }}
              />
            </div>
          </>
        ) : (
          <p className="hint">
            Значения копятся сами, когда вы собираете ссылки. Смотрите на них раз в месяц: почти
            всегда там находится пара вариантов одного и того же.
          </p>
        )}

        {error ? <p className="hint hint--error">{error}</p> : null}
        {report ? <p className="hint">{report}</p> : null}
      </div>

      {/* Форма создания — рядом со списком, а не вместо него: на широком
          экране она уходит в боковую колонку, на узком встаёт сверху. */}
      <div className="lib-cols">
        <div className="lib-main">
          {busy ? (
            <p className="empty">Читаю библиотеку…</p>
          ) : tab === 'dictionary' ? (
            <DictionaryView dict={dict} splits={splits} onMerge={merge} />
          ) : shown.length === 0 ? (
        <EmptyNote
          text={
            list.length === 0
              ? 'Шаблонов пока нет. Соберите ссылку и сохраните набор меток — он появится здесь.'
              : 'По этому запросу ничего нет.'
          }
        />
      ) : view === 'table' ? (
        /* Таблица — третий вид из 2.2. Здесь она нужнее, чем в истории:
           шаблоны сравнивают между собой по меткам, а в списке значения
           слиты в одну строку через точку. */
        <div className="glass">
          <div className="htable htable--templates" role="table">
            <div className="htable-head" role="row">
              <span role="columnheader">Название</span>
              <span role="columnheader">Источник</span>
              <span role="columnheader">Канал</span>
              <span role="columnheader">Кампания</span>
              <span role="columnheader">Тег</span>
              <span role="columnheader" />
            </div>
            {shown.map((template) => (
              <div className="htable-row" role="row" key={template.id}>
                <span role="cell">{template.name}</span>
                <span role="cell">{template.params?.source ?? '—'}</span>
                <span role="cell">{template.params?.medium ?? '—'}</span>
                <span role="cell">{template.params?.campaign ?? '—'}</span>
                <span role="cell">
                  {template.tagName ? (
                    <>
                      {template.tagColor ? (
                        <span
                          className="tag-dot"
                          style={{ background: template.tagColor }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {template.tagName}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <span role="cell" className="htable-acts">
                  <button
                    type="button"
                    className="ibtn"
                    title="В генератор"
                    onClick={() => apply(template)}
                  >
                    <PixelIcon name="wand" />
                  </button>
                  <button
                    type="button"
                    className="ibtn"
                    title="Удалить"
                    onClick={() => drop(template.id)}
                  >
                    <PixelIcon name="trash" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={view === 'grid' ? 'cards' : 'hist'}>
          {shown.map((template) => (
            <div className="hist-row" key={template.id}>
              <div className="hist-main">
                <div className="hist-name">
                  {template.tagColor ? (
                    <span className="tag-dot" style={{ background: template.tagColor }} aria-hidden="true" />
                  ) : null}
                  {template.name}
                  {template.tagName ? <span className="hist-tag">{template.tagName}</span> : null}
                </div>
                <div className="hist-url">
                  {UTM_KEYS.filter((key) => template.params?.[key])
                    .map((key) => `${key}=${template.params?.[key]}`)
                    .join(' · ') || 'Без меток'}
                </div>
              </div>
              <span className="htable-acts">
                <button type="button" className="ibtn" title="В генератор" onClick={() => apply(template)}>
                  <PixelIcon name="wand" />
                </button>
                <button type="button" className="ibtn" title="Удалить" onClick={() => drop(template.id)}>
                  <PixelIcon name="trash" />
                </button>
              </span>
            </div>
          ))}
        </div>
          )}
        </div>

        <div className="lib-side">
          {tab === 'templates' ? (
            <TemplateForm
              onCreated={(template) => {
                // Кладём в список сразу, не дожидаясь перечитывания: человек
                // видит результат нажатия, а не «ничего не произошло».
                setItems((prev) => [template, ...(prev ?? [])])
              }}
            />
          ) : (
            <DictionaryForm onAdded={() => setReload((value) => value + 1)} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── справочник ─────────────────────────── */

interface DictionaryViewProps {
  dict: DictEntry[]
  splits: SplitGroup[]
  onMerge: (kind: UtmKey, alias: string, canonical: string) => void
}

function DictionaryView({ dict, splits, onMerge }: DictionaryViewProps) {
  if (dict.length === 0) {
    return <EmptyNote text="Справочник наполнится сам, как только вы соберёте первую ссылку." />
  }

  return (
    <>
      {splits.length > 0 ? (
        <div className="glass">
          <div className="qhead">
            <span className="qchip qchip--magenta">!</span>
            <span className="qtitle qtitle--magenta">Одно и то же разными словами</span>
          </div>
          <p className="hint">
            В отчёте площадки такие значения станут разными строками, и трафик кампании разъедется
            надвое. Сведите их — дальше подсказки будут предлагать только канон.
          </p>
          {splits.map((split) => (
            <div className="issue issue--info" key={`${split.kind}-${split.suggested}`}>
              <div className="issue-title">
                {KIND_LABEL[split.kind]}: {split.variants.map((entry) => entry.value).join(' · ')}
              </div>
              <div className="issue-text">
                Всего {split.totalUses} использований. Канон — самое частое написание,
                <b> {split.suggested}</b>.
              </div>
              {split.variants
                .filter((entry) => entry.value !== split.suggested)
                .map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    className="issue-fix"
                    onClick={() => onMerge(split.kind, entry.value, split.suggested)}
                  >
                    {entry.value} → {split.suggested}
                  </button>
                ))}
            </div>
          ))}
        </div>
      ) : null}

      {UTM_KEYS.map((kind) => {
        const values = dict.filter((entry) => entry.kind === kind)
        if (values.length === 0) return null
        return (
          <div className="glass" key={kind}>
            <div className="qhead">
              <span className="qchip">{values.length}</span>
              <span className="qtitle qtitle--teal">{KIND_LABEL[kind]}</span>
            </div>
            <div className="dict">
              {values.map((entry) => (
                <span className={`dict-item${entry.canonical ? ' dict-item--alias' : ''}`} key={entry.value}>
                  {entry.value}
                  <b>{entry.uses}</b>
                  {entry.canonical ? <i>→ {entry.canonical}</i> : null}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
