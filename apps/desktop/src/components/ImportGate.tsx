import { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { PixelIcon } from '@utmka/ui'

/**
 * Перенос данных из версии 2.2 — предложение при первом запуске.
 *
 * Почему сразу, а не в настройках: у владельца в базе 2.2 лежит живая история
 * и шаблоны, и они бесполезны, если предложение спрятано. Отметка в таблице
 * `meta` не даст спросить второй раз — ни после переноса, ни после отказа.
 *
 * Компонент живёт только в десктопе: в вебе переносить нечего, и `@utmka/ui`
 * о нём ничего не знает.
 */

interface Probe {
  path: string | null
  links: number
  templates: number
  done: boolean
}

interface ImportResult {
  added: number
  skipped: string[]
}

interface ImportReport {
  links: ImportResult
  templates: ImportResult
}

/** Русское склонение для чисел — «31 ссылка», «13 шаблонов». */
function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} ${few}`
  return `${count} ${many}`
}

export function ImportGate() {
  const [probe, setProbe] = useState<Probe | null>(null)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    void invoke<Probe>('import22_probe')
      .then((result) => {
        if (alive) setProbe(result)
      })
      .catch(() => {
        // Нет базы 2.2 или её не прочитать — просто не предлагаем.
        if (alive) setProbe(null)
      })
    return () => {
      alive = false
    }
  }, [])

  const run = useCallback(async () => {
    if (!probe?.path) return
    setBusy(true)
    setError('')
    try {
      setReport(await invoke<ImportReport>('import22_run', { path: probe.path }))
    } catch (raw) {
      const failure = raw as { message?: string }
      setError(failure?.message ?? 'Не удалось перенести данные')
    } finally {
      setBusy(false)
    }
  }, [probe])

  const dismiss = useCallback(async () => {
    await invoke('import22_dismiss').catch(() => undefined)
    setProbe(null)
    setReport(null)
  }, [])

  if (!probe?.path || probe.done) return null

  const skipped = report ? [...report.links.skipped, ...report.templates.skipped] : []

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Перенос данных из версии 2.2">
      <div className="modal-back" onClick={report ? dismiss : undefined} />
      <div className="modal-card glass">
        <div className="qhead">
          <span className="qchip qchip--teal">
            <PixelIcon name="clock" />
          </span>
          <span className="qtitle qtitle--teal">
            {report ? 'Перенесли' : 'Нашли данные версии 2.2'}
          </span>
        </div>

        {report ? (
          <>
            <p className="hint">
              История: {plural(report.links.added, 'ссылка', 'ссылки', 'ссылок')}. Шаблоны:{' '}
              {plural(report.templates.added, 'шаблон', 'шаблона', 'шаблонов')}. Значения из
              перенесённых ссылок уже в справочнике.
            </p>

            {skipped.length > 0 ? (
              <div className="issue issue--info">
                <div className="issue-title">Не легли — {skipped.length}</div>
                {/* Поимённо: «загружено 8 из 13» не говорит, что именно потерялось. */}
                <div className="issue-text">
                  {skipped.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="hint">
              Версия 2.2 осталась на месте и работает: её файл мы открывали только на чтение.
            </p>

            <div className="result-row">
              <button type="button" className="btn btn--main" onClick={dismiss}>
                Понятно
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="hint">
              В базе прошлой версии — {plural(probe.links, 'ссылка', 'ссылки', 'ссылок')} и{' '}
              {plural(probe.templates, 'шаблон', 'шаблона', 'шаблонов')}. Перенести их сюда?
              Даты сохранятся, значения попадут в справочник.
            </p>
            <p className="hint">
              Файл 2.2 мы только читаем: сама программа останется рабочей со своими данными.
            </p>

            {error ? <p className="hint hint--error">{error}</p> : null}

            <div className="result-row">
              <button type="button" className="btn btn--main" onClick={run} disabled={busy}>
                <PixelIcon name="save" />
                {busy ? 'Переношу…' : 'Перенести'}
              </button>
              <button type="button" className="btn btn--sm" onClick={dismiss} disabled={busy}>
                Не переносить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
