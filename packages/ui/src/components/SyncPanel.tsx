'use client'

/**
 * Обмен с веб-аккаунтом — панель в помощи приложения.
 *
 * Сценарий один: дома человек работает в окне, в поездке в браузере, и набор
 * шаблонов должен быть общим. Ввёл фразу один раз — дальше кнопка.
 *
 * ⚠️ Обмен только добавляет. Удаления не переносятся, и это написано прямо в
 * панели: чтобы отличить «удалили здесь» от «завели там», нужен журнал
 * удалений с обеих сторон, а без него стёртое возвращается при ближайшем
 * обмене. Умолчать об этом хуже, чем не уметь.
 */

import { useCallback, useEffect, useState } from 'react'
import { backendMessage, describeSync, planHistory, planTemplates } from '@utmka/core'

import { PixelIcon } from './PixelIcon'
import { backend } from '../shell'
import { sayAbout } from '../lib/mascot-lines'

interface Linked {
  linked: boolean
  lastAt?: string
}

function when(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SyncPanel() {
  const sync = backend.sync
  const [state, setState] = useState<Linked>({ linked: false })
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState('')

  useEffect(() => {
    if (!sync) return undefined
    let alive = true
    void sync
      .state()
      .then((found) => {
        if (alive) setState(found)
      })
      .catch(() => {
        /* База недоступна — панель просто покажет «не привязан». */
      })
    return () => {
      alive = false
    }
  }, [sync])

  const link = useCallback(async () => {
    if (!sync || !passphrase.trim()) return
    setBusy(true)
    setError('')
    try {
      setState(await sync.link(passphrase.trim()))
      // Фразу из поля убираем сразу: она больше не нужна ни нам, ни экрану.
      setPassphrase('')
      setReport('Аккаунт привязан. Теперь можно обмениваться.')
    } catch (failure) {
      setError(backendMessage(failure))
    } finally {
      setBusy(false)
    }
  }, [sync, passphrase])

  const unlink = useCallback(async () => {
    if (!sync) return
    setBusy(true)
    setError('')
    try {
      setState(await sync.unlink())
      setReport('Аккаунт отвязан. Данные на этом компьютере остались на месте.')
    } catch (failure) {
      setError(backendMessage(failure))
    } finally {
      setBusy(false)
    }
  }, [sync])

  const run = useCallback(async () => {
    if (!sync) return
    setBusy(true)
    setError('')
    setReport('')

    try {
      /* Снимок аккаунта берём один: между двумя запросами человек успевает
         что-то сохранить в браузере, и план считался бы по устаревшему. */
      const remote = await sync.pull()
      const [localTemplates, localLinks] = await Promise.all([
        backend.templates.list(),
        backend.history.list(),
      ])

      const templates = planTemplates(localTemplates, remote.templates)
      const links = planHistory(localLinks, remote.links)

      const sent = await sync.push(
        templates.upload.map(({ id: _id, ...rest }) => rest),
        links.upload.map(({ id: _id, ...rest }) => rest),
      )

      /* Забираем чужое своими же портами: тогда потолок 500 и наполнение
         справочника работают ровно так же, как при обычном сохранении. */
      let templatesDown = 0
      let linksDown = 0
      if (templates.download.length > 0) {
        const result = await backend.templates.importMany(
          templates.download.map(({ id: _id, ...rest }) => rest),
        )
        templatesDown = result.added
      }
      if (links.download.length > 0) {
        const result = await backend.history.importMany(
          links.download.map(({ id: _id, ...rest }) => rest),
        )
        linksDown = result.added
      }

      setReport(
        describeSync({
          templatesUp: sent.templatesAdded,
          templatesDown,
          linksUp: sent.linksAdded,
          linksDown,
          conflicts: templates.conflicts,
        }),
      )
      setState(await sync.state())
      sayAbout('imported')
    } catch (failure) {
      setError(backendMessage(failure))
    } finally {
      setBusy(false)
    }
  }, [sync])

  // Обмениваться не с чем: это веб, здесь аккаунт и так свой.
  if (!sync) return null

  return (
    <div className="glass">
      <div className="qhead">
        <span className="qchip qchip--teal">
          <PixelIcon name="key" />
        </span>
        <span className="qtitle qtitle--teal">Общие шаблоны с веб-версией</span>
      </div>

      {state.linked ? (
        <>
          <p className="hint">
            Аккаунт привязан{state.lastAt ? `, последний обмен ${when(state.lastAt)}` : ''}.
            Обмен добавляет недостающее в обе стороны — <b>удаления не переносятся</b>, и
            шаблоны с одинаковым именем, но разными метками остаются нетронутыми.
          </p>
          <div className="result-row">
            <button type="button" className="btn btn--main" onClick={run} disabled={busy}>
              <PixelIcon name="use" />
              {busy ? 'Обмениваюсь…' : 'Синхронизировать'}
            </button>
            <button type="button" className="btn btn--sm" onClick={unlink} disabled={busy}>
              Отвязать
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="hint">
            Введите кодовую фразу веб-версии — шаблоны и история станут общими. Само приложение
            работает без входа и продолжит работать: фраза нужна только для обмена и на этот
            компьютер не сохраняется.
          </p>
          <div className="field">
            <div className="input">
              <PixelIcon name="key" />
              <input
                type="text"
                className="ym-disable-keys ym-hide-content"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                placeholder="пять слов и число через дефис"
                aria-label="Кодовая фраза веб-версии"
                autoComplete="off"
                spellCheck={false}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void link()
                }}
              />
            </div>
          </div>
          <div className="result-row">
            <button
              type="button"
              className="btn btn--main"
              onClick={link}
              disabled={busy || !passphrase.trim()}
            >
              <PixelIcon name="key" />
              {busy ? 'Проверяю…' : 'Привязать аккаунт'}
            </button>
          </div>
        </>
      )}

      {error ? <p className="hint hint--error">{error}</p> : null}
      {report ? <p className="explain">{report}</p> : null}
    </div>
  )
}
