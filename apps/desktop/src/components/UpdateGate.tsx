import { useCallback, useEffect, useState } from 'react'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { PixelIcon } from '@utmka/ui'

/**
 * Обновления «по воздуху».
 *
 * Паритет с 2.2: та умела обновляться сама, и терять это в 3.0 нельзя —
 * иначе исправления доезжают только до тех, кто сам зайдёт на страницу релизов.
 *
 * Проверка одна, при запуске, и молчаливая: если обновления нет — человек
 * ничего не увидит. Ставим только по нажатию: приложение не должно перезапускать
 * себя посреди работы.
 *
 * ⚠️ Три вещи здесь не украшение, а то, что было в окне 2.2 и без чего
 * обновление выглядит как зависание: что именно изменилось, ссылка на полный
 * список правок и ход скачивания. Установщик весит десятки мегабайт, и без
 * полосы человек полминуты смотрит на кнопку, которая «не сработала».
 */

/** Адрес страницы релизов: полные заметки к версии живут там. */
const RELEASES = 'https://github.com/Goryuchnick/UTMka-official-service/releases/latest'

/** Сколько строк заметок показываем: остальное — по ссылке. */
const NOTES_LIMIT = 320

type Stage = 'idle' | 'downloading' | 'installing'

function shorten(notes: string): string {
  const clean = notes.trim()
  return clean.length > NOTES_LIMIT ? `${clean.slice(0, NOTES_LIMIT).trimEnd()}…` : clean
}

/** Проценты: без общего размера показываем накопленные мегабайты. */
function progressLabel(done: number, total: number): string {
  if (total > 0) return `${Math.min(100, Math.round((done / total) * 100))}%`
  return `${(done / 1024 / 1024).toFixed(1)} МБ`
}

export function UpdateGate() {
  const [update, setUpdate] = useState<Update | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    void check()
      .then((found) => {
        if (alive && found) setUpdate(found)
      })
      .catch(() => {
        /* Нет сети, нет доступа к GitHub, запуск из dev-сборки — всё это не
           повод беспокоить: инструмент работает без обновления. */
      })
    return () => {
      alive = false
    }
  }, [])

  const install = useCallback(async () => {
    if (!update) return
    setStage('downloading')
    setError('')
    setDone(0)
    setTotal(0)

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') setTotal(event.data.contentLength ?? 0)
        else if (event.event === 'Progress') setDone((was) => was + event.data.chunkLength)
        else if (event.event === 'Finished') setStage('installing')
      })
      await relaunch()
    } catch {
      setError('Не удалось обновиться. Попробуйте позже или скачайте вручную.')
      setStage('idle')
    }
  }, [update])

  if (!update) return null

  const busy = stage !== 'idle'
  const notes = update.body ? shorten(update.body) : ''

  return (
    <div className="invite invite--update">
      <div className="update-main">
        <span>
          <b>Есть версия {update.version}.</b> Обновление скачается и поставится само,
          приложение перезапустится.
        </span>

        {/* Что именно изменилось — до нажатия, а не после перезапуска. */}
        {notes ? <p className="hint update-notes">{notes}</p> : null}

        {busy ? (
          <div className="update-progress">
            <div className="update-bar">
              <span
                className="update-bar__fill"
                style={{ width: total > 0 ? `${Math.min(100, (done / total) * 100)}%` : '100%' }}
              />
            </div>
            <span className="hint">
              {stage === 'installing' ? 'Ставлю…' : `Скачиваю — ${progressLabel(done, total)}`}
            </span>
          </div>
        ) : null}

        {error ? <p className="hint hint--error">{error}</p> : null}
      </div>

      <div className="result-row">
        <button type="button" className="btn btn--sm" onClick={install} disabled={busy}>
          <PixelIcon name="save" />
          {busy ? 'Обновляю…' : 'Обновить'}
        </button>
        {/* Ссылка обычная: её перехватит `catchExternalLinks` и откроет в
            системном браузере — внутри вебвью открывать нечего. */}
        <a
          className="btn btn--sm"
          href={RELEASES}
          target="_blank"
          rel="noopener noreferrer"
        >
          <PixelIcon name="code" />
          Что нового
        </a>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => setUpdate(null)}
          disabled={busy}
        >
          Позже
        </button>
      </div>
    </div>
  )
}
