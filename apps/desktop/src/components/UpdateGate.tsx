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
 */
export function UpdateGate() {
  const [update, setUpdate] = useState<Update | null>(null)
  const [busy, setBusy] = useState(false)
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
    setBusy(true)
    setError('')
    try {
      await update.downloadAndInstall()
      await relaunch()
    } catch {
      setError('Не удалось обновиться. Попробуйте позже или скачайте вручную.')
      setBusy(false)
    }
  }, [update])

  if (!update) return null

  return (
    <div className="invite">
      <span>
        <b>Есть версия {update.version}.</b> Обновление скачается и поставится само,
        приложение перезапустится.
        {error ? ` ${error}` : ''}
      </span>
      <button type="button" className="btn btn--sm" onClick={install} disabled={busy}>
        <PixelIcon name="save" />
        {busy ? 'Ставлю…' : 'Обновить'}
      </button>
      <button type="button" className="btn btn--sm" onClick={() => setUpdate(null)} disabled={busy}>
        Позже
      </button>
    </div>
  )
}
