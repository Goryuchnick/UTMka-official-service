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
import { useRouter } from 'next/navigation'
import {
  detectSplits,
  UTM_KEYS,
  type DictEntry,
  type SplitGroup,
  type Template,
  type UtmKey,
} from '@utmka/core'

import { PixelIcon } from '@/components/PixelIcon'
import { EmptyNote, ViewSwitch } from '@/components/ViewSwitch'
import { VaultGate } from '@/components/VaultGate'
import { useAccount } from '@/lib/account'
import { useSetMascotLine } from '@/lib/mascot'
import { useViewMode } from '@/lib/view'
import {
  exportCsv,
  exportJson,
  parseTemplatesCsv,
  parseTemplatesJson,
  templatesToCsv,
  templatesToJson,
} from '@/lib/exchange'

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
    const [templatesResponse, dictResponse] = await Promise.all([
      fetch('/api/templates', { cache: 'no-store' }),
      fetch('/api/dictionary', { cache: 'no-store' }),
    ])

    const templatesData = (await templatesResponse.json()) as { items?: Template[]; error?: string }
    const dictData = (await dictResponse.json()) as { items?: DictEntry[] }

    if (!templatesResponse.ok) {
      // 401 — не ошибка, а «фразы нет»: об этом говорит отдельный экран.
      return {
        items: [],
        dict: [],
        error: templatesResponse.status === 401 ? '' : (templatesData.error ?? 'Не удалось прочитать шаблоны'),
      }
    }
    return { items: templatesData.items ?? [], dict: dictData.items ?? [], error: '' }
  } catch {
    return { items: [], dict: [], error: 'Сеть не отвечает' }
  }
}

export function TemplatesScreen() {
  const router = useRouter()
  const { state } = useAccount()
  const { view, setView } = useViewMode('templates')

  const [tab, setTab] = useState<Tab>('templates')
  // null — «ещё не читали»: отдельный флаг загрузки потребовал бы setState
  // прямо в эффекте, а это лишний каскад рендеров.
  const [items, setItems] = useState<Template[] | null>(null)
  const [dict, setDict] = useState<DictEntry[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
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
    await fetch(`/api/templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  }, [])

  const apply = useCallback(
    (template: Template) => {
      const params = new URLSearchParams({ url: template.baseUrl ?? '' })
      for (const [key, value] of Object.entries(template.params ?? {})) {
        if (value) params.set(key, value)
      }
      router.push(`/?${params.toString()}`)
    },
    [router],
  )

  const merge = useCallback(
    async (kind: UtmKey, alias: string, canonical: string) => {
      setDict((prev) =>
        prev.map((entry) =>
          entry.kind === kind && entry.value === alias ? { ...entry, canonical } : entry,
        ),
      )
      await fetch('/api/dictionary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, alias, canonical }),
      })
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
        setError('В файле не нашлось ни одного шаблона')
        return
      }

      let added = 0
      for (const row of parsed) {
        const response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(row),
        })
        if (response.ok) added += 1
      }
      setError(
        added === parsed.length
          ? ''
          : `Загружено ${added} из ${parsed.length}: остальные совпали по названию`,
      )
      setReload((value) => value + 1)
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
                onClick={() => exportJson('utmka-templates', templatesToJson(list))}
              >
                <PixelIcon name="save" />
                Выгрузить JSON
              </button>
              <button
                type="button"
                className="btn btn--sm"
                disabled={list.length === 0}
                onClick={() => exportCsv('utmka-templates', templatesToCsv(list))}
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
      </div>

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
