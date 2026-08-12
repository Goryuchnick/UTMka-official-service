'use client'

/**
 * История собранных ссылок.
 *
 * Паритет с 2.2: поиск, три вида отображения с запоминанием выбора, действия
 * над записью. Потолок 500 держит сервер, здесь его только объясняем.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HistoryItem } from '@utmka/core'

import { PixelIcon } from '@/components/PixelIcon'
import { EmptyNote, ViewSwitch } from '@/components/ViewSwitch'
import { VaultGate } from '@/components/VaultGate'
import { useAccount } from '@/lib/account'
import { useSetMascotLine } from '@/lib/mascot'
import { useViewMode } from '@/lib/view'
import { exportJson, exportCsv, historyToCsv, historyToJson, parseHistory } from '@/lib/exchange'

const ORIGIN_LABEL: Record<HistoryItem['origin'], string> = {
  single: 'Генератор',
  batch: 'Пакет',
  brief: 'Помощник',
  parse: 'Разбор',
}

/**
 * Чтение вынесено из компонента: эффект должен только подписываться на внешний
 * мир и класть результат в колбэке — тогда React не получает каскад рендеров,
 * а правило `set-state-in-effect` видит корректный паттерн.
 */
async function fetchHistory(): Promise<{ items: HistoryItem[]; error: string }> {
  try {
    const response = await fetch('/api/history', { cache: 'no-store' })
    const data = (await response.json()) as { items?: HistoryItem[]; error?: string }
    if (!response.ok) {
      // 401 — не ошибка, а «фразы нет»: об этом говорит отдельный экран.
      return { items: [], error: response.status === 401 ? '' : (data.error ?? 'Не удалось прочитать историю') }
    }
    return { items: data.items ?? [], error: '' }
  } catch {
    return { items: [], error: 'Сеть не отвечает' }
  }
}

function when(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryScreen() {
  const router = useRouter()
  const { state } = useAccount()
  const { view, setView } = useViewMode('history')

  // null — «ещё не читали». Отдельного флага загрузки нет намеренно: он
  // требовал бы setState прямо в эффекте, а это лишний каскад рендеров.
  const [items, setItems] = useState<HistoryItem[] | null>(null)
  const [query, setQuery] = useState('')
  /** Диапазон дат — паритет с 2.2 (`historyDateRange`). Пусто = без границы. */
  const [from, setFrom] = useState('')
  const [till, setTill] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  /** Счётчик перечитываний: растёт после импорта, эффект на него подписан. */
  const [reload, setReload] = useState(0)

  const busy = state === 'unknown' || (state === 'member' && items === null)

  useSetMascotLine(
    state === 'member'
      ? 'Здесь всё, что вы собрали. Поиск идёт и по ссылке, и по меткам.'
      : 'История живёт за фразой: без неё собранная ссылка исчезает с закрытием вкладки.',
    state === 'member' ? 'neutral' : 'alert',
  )

  useEffect(() => {
    if (state !== 'member') return undefined

    let alive = true
    void fetchHistory().then((result) => {
      if (!alive) return
      setItems(result.items)
      setError(result.error)
    })
    return () => {
      alive = false
    }
  }, [state, reload])

  const list = useMemo(() => items ?? [], [items])

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    // Границы включительные: «с 1 по 3» должно включать и первое, и третье.
    const after = from ? new Date(`${from}T00:00:00`).getTime() : null
    const before = till ? new Date(`${till}T23:59:59`).getTime() : null

    return list.filter((item) => {
      if (after !== null || before !== null) {
        const at = item.createdAt ? new Date(item.createdAt).getTime() : null
        if (at === null) return false
        if (after !== null && at < after) return false
        if (before !== null && at > before) return false
      }
      if (!needle) return true
      const haystack = [item.url, ...Object.values(item.params ?? {})].join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }, [list, query, from, till])

  const drop = useCallback(
    async (id: string) => {
      setItems((prev) => (prev ?? []).filter((item) => item.id !== id))
      await fetch(`/api/history?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
    [],
  )

  const wipe = useCallback(async () => {
    setItems([])
    await fetch('/api/history', { method: 'DELETE' })
  }, [])

  /** Импорт истории — паритет с 2.2: перенос между устройствами файлом. */
  const importFile = useCallback(async (file: File) => {
    const parsed = parseHistory(await file.text(), file.name.toLowerCase().endsWith('.csv'))
    if (parsed.length === 0) {
      setError('В файле не нашлось ни одной ссылки')
      return
    }

    let added = 0
    for (const row of parsed) {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(row),
      })
      if (response.ok) added += 1
    }
    setError(added === parsed.length ? '' : `Загружено ${added} из ${parsed.length}`)
    setReload((value) => value + 1)
  }, [])

  const reuse = useCallback(
    (item: HistoryItem) => {
      const params = new URLSearchParams({ url: item.baseUrl || item.url })
      for (const [key, value] of Object.entries(item.params ?? {})) {
        if (value) params.set(key, value)
      }
      router.push(`/?${params.toString()}`)
    },
    [router],
  )

  if (state === 'guest') {
    return (
      <div className="screen-scroll">
        <VaultGate
          title="История"
          what="Каждая собранная ссылка попадает сюда вместе с метками и датой — можно найти прошлый запуск и повторить его, не собирая заново."
        />
      </div>
    )
  }

  return (
    <div className="screen-scroll">
      <div className="glass">
        <div className="qhead">
          <span className="qchip">
            <PixelIcon name="clock" />
          </span>
          <span className="qtitle qtitle--amber">История</span>
        </div>

        <div className="field">
          <div className="input">
            <PixelIcon name="search" />
            <input
              type="text"
              className="ym-disable-keys ym-hide-content"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по ссылке и меткам"
              aria-label="Поиск по истории"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="result-row dates">
          <span className="field-label">Период</span>
          <input
            type="date"
            className="datefield"
            value={from}
            max={till || undefined}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Начало периода"
          />
          <span className="hint">—</span>
          <input
            type="date"
            className="datefield"
            value={till}
            min={from || undefined}
            onChange={(event) => setTill(event.target.value)}
            aria-label="Конец периода"
          />
          {from || till ? (
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                setFrom('')
                setTill('')
              }}
            >
              Сбросить
            </button>
          ) : null}
        </div>

        <div className="result-row">
          <ViewSwitch view={view} onChange={setView} />
          <span className="result-len">
            {list.length} из 500
          </span>
        </div>

        <div className="result-row">
          <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
            <PixelIcon name="save" />
            Загрузить файл
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
          <button
            type="button"
            className="btn btn--sm"
            disabled={list.length === 0}
            onClick={() => exportJson('utmka-history', historyToJson(list))}
          >
            <PixelIcon name="save" />
            Выгрузить JSON
          </button>
          <button
            type="button"
            className="btn btn--sm"
            disabled={list.length === 0}
            onClick={() => exportCsv('utmka-history', historyToCsv(list))}
          >
            <PixelIcon name="save" />
            Выгрузить CSV
          </button>
          <button type="button" className="btn btn--sm" disabled={list.length === 0} onClick={wipe}>
            <PixelIcon name="trash" />
            Очистить
          </button>
        </div>

        {error ? <p className="hint hint--error">{error}</p> : null}
      </div>

      {busy ? (
        <p className="empty">Читаю историю…</p>
      ) : shown.length === 0 ? (
        <EmptyNote
          text={
            list.length === 0
              ? 'Пока пусто. Соберите ссылку — она сохранится сюда сама.'
              : 'По этому запросу и периоду ничего нет.'
          }
        />
      ) : view === 'table' ? (
        <div className="glass">
          <div className="htable" role="table">
            <div className="htable-head" role="row">
              <span role="columnheader">Когда</span>
              <span role="columnheader">Источник</span>
              <span role="columnheader">Кампания</span>
              <span role="columnheader">Ссылка</span>
              <span role="columnheader" />
            </div>
            {shown.map((item) => (
              <div className="htable-row" role="row" key={item.id}>
                <span role="cell">{when(item.createdAt)}</span>
                <span role="cell">{item.params?.source ?? '—'}</span>
                <span role="cell">{item.params?.campaign ?? '—'}</span>
                <span role="cell" className="htable-url">
                  {item.shortUrl ?? item.url}
                </span>
                <span role="cell" className="htable-acts">
                  <button type="button" className="ibtn" title="В генератор" onClick={() => reuse(item)}>
                    <PixelIcon name="wand" />
                  </button>
                  <button type="button" className="ibtn" title="Удалить" onClick={() => drop(item.id)}>
                    <PixelIcon name="trash" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={view === 'grid' ? 'cards' : 'hist'}>
          {shown.map((item) => (
            <div className="hist-row" key={item.id}>
              <div className="hist-main">
                <div className="hist-name">
                  {item.params?.campaign || item.params?.source || 'Без названия'}
                  <span className="hist-tag">{ORIGIN_LABEL[item.origin]}</span>
                </div>
                <div className="hist-url">{item.shortUrl ?? item.url}</div>
              </div>
              <span className="hist-when">{when(item.createdAt)}</span>
              <span className="htable-acts">
                <button
                  type="button"
                  className="ibtn"
                  title="Скопировать"
                  onClick={() => void navigator.clipboard.writeText(item.shortUrl ?? item.url)}
                >
                  <PixelIcon name="copy" />
                </button>
                <button type="button" className="ibtn" title="В генератор" onClick={() => reuse(item)}>
                  <PixelIcon name="wand" />
                </button>
                <button type="button" className="ibtn" title="Удалить" onClick={() => drop(item.id)}>
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
