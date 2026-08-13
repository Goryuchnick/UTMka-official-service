'use client'

/**
 * Добавить значение в справочник руками.
 *
 * Обычно справочник наполняется сам — побочным эффектом сохранения ссылки.
 * Но канон полезно завести заранее: договорились в команде писать `yandex`,
 * а не `Yandex`, — и подсказки предлагают правильное написание с первого дня,
 * ещё до того, как кто-то соберёт первую ссылку.
 */

import { useCallback, useState } from 'react'
import { backendMessage, UTM_KEYS, type UtmKey } from '@utmka/core'

import { PixelIcon } from './PixelIcon'
import { backend } from '../shell'

const KIND_LABEL: Record<UtmKey, string> = {
  source: 'Источник',
  medium: 'Канал',
  campaign: 'Кампания',
  content: 'Содержание',
  term: 'Ключевое слово',
}

interface DictionaryFormProps {
  /** Перечитать справочник: значение могло лечь новым или увеличить счётчик. */
  onAdded: () => void
}

export function DictionaryForm({ onAdded }: DictionaryFormProps) {
  const [kind, setKind] = useState<UtmKey>('source')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = useCallback(async () => {
    const clean = value.trim()
    if (!clean) return

    setBusy(true)
    setError('')
    try {
      // Тот же путь, что у обычного сохранения ссылки: значение проходит
      // через `track`, а не пишется в обход — иначе счётчики разъедутся.
      await backend.dictionary.track({ [kind]: clean })
      setValue('')
      onAdded()
    } catch (failure) {
      setError(backendMessage(failure))
    } finally {
      setBusy(false)
    }
  }, [kind, value, onAdded])

  return (
    <div className="glass">
      <div className="qhead">
        <span className="qchip qchip--teal">
          <PixelIcon name="wand" />
        </span>
        <span className="qtitle qtitle--teal">Добавить значение</span>
      </div>

      <p className="hint">
        Справочник копится сам, когда вы собираете ссылки. Здесь — если канон нужно
        задать заранее, до первой ссылки.
      </p>

      <div className="field">
        <span className="field-label">Куда</span>
        <div className="chips" role="group" aria-label="Вид значения">
          {UTM_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="chip"
              aria-pressed={kind === key}
              onClick={() => setKind(key)}
              style={
                kind === key ? { color: 'var(--hv2-fg)', borderColor: 'var(--hv2-primary)' } : undefined
              }
            >
              {KIND_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Значение</span>
        <div className="input">
          <input
            type="text"
            className="ym-disable-keys ym-hide-content"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit()
            }}
            placeholder="yandex"
            aria-label="Значение"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {error ? <p className="hint hint--error">{error}</p> : null}

      <div className="result-row">
        <button type="button" className="btn btn--main" disabled={!value.trim() || busy} onClick={submit}>
          <PixelIcon name="save" />
          {busy ? 'Добавляю…' : 'Добавить'}
        </button>
      </div>
    </div>
  )
}
