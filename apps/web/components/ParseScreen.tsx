'use client'

/**
 * ParseScreen — разбор чужой ссылки: вставил URL, увидел таблицу параметров,
 * список проблем и кнопку «починить» (ASSISTANT-SPEC §2.4).
 *
 * Лучший вход для новичка: человек приходит с готовой ссылкой, а не с формой.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  buildUrl,
  normalizeDraft,
  parseUrl,
  UTM_KEYS,
  UTM_PARAM_NAMES,
  validateParsed,
  type UtmKey,
} from '@utmka/core'

import { IssueList } from '@/components/generator/IssueList'
import { ResultCard } from '@/components/generator/ResultCard'
import { PixelIcon } from '@/components/PixelIcon'
import { useSetMascotLine } from '@/lib/mascot'

const FIELD_LABELS: Record<UtmKey, string> = {
  source: 'Источник',
  medium: 'Канал',
  campaign: 'Кампания',
  content: 'Содержание',
  term: 'Ключевое слово',
}

export function ParseScreen() {
  const [raw, setRaw] = useState('')
  const [fixed, setFixed] = useState<string | null>(null)

  const parsed = useMemo(() => (raw.trim() ? parseUrl(raw) : null), [raw])
  const issues = useMemo(() => (parsed ? validateParsed(parsed) : []), [parsed])
  const blocking = issues.filter((issue) => issue.level !== 'info')

  const line = !parsed
    ? 'Вставьте чужую ссылку — покажу, что в ней не так.'
    : blocking.length === 0
      ? 'Разметка в порядке: значения и тип трафика на месте.'
      : `Нашёл ${blocking.length} ${plural(blocking.length)} — ниже написал, что сломается.`

  useSetMascotLine(line)

  const fix = useCallback(() => {
    if (!parsed) return
    const { draft } = normalizeDraft({ baseUrl: parsed.baseUrl, params: parsed.params })
    setFixed(buildUrl(draft))
  }, [parsed])

  return (
    <div className="screen-scroll">
      <div className="glass">
        <div className="qhead">
          <span className="qchip">
            <PixelIcon name="search" />
          </span>
          <span className="qtitle qtitle--amber">Разбор чужой ссылки</span>
        </div>

        <div className="input">
          <input
            type="text"
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value)
              setFixed(null)
            }}
            placeholder="https://example.ru/page?utm_source=VK&utm_medium=Social"
            aria-label="Ссылка для разбора"
            autoComplete="off"
            spellCheck={false}
          />
          {raw ? (
            <button
              type="button"
              className="ibtn"
              onClick={() => {
                setRaw('')
                setFixed(null)
              }}
              aria-label="Очистить"
            >
              <PixelIcon name="trash" />
            </button>
          ) : null}
        </div>

        {!parsed ? (
          <p className="hint">
            Разбираем метки, находим дубли параметров и чужую разметку вроде yclid. Ничего никуда
            не отправляем — всё считается прямо здесь.
          </p>
        ) : null}
      </div>

      {parsed?.valid ? (
        <>
          <div className="glass">
            <div className="qhead">
              <span className="qchip qchip--teal">
                <PixelIcon name="grid" />
              </span>
              <span className="qtitle qtitle--teal">Что в ссылке</span>
            </div>

            <div className="params">
              <div className="param">
                <span className="param-name">Адрес</span>
                <span className="param-value">{parsed.baseUrl}</span>
              </div>
              {UTM_KEYS.map((key) => {
                const value = parsed.params[key]
                return (
                  <div className="param" key={key}>
                    <span className="param-name">
                      {FIELD_LABELS[key]}{' '}
                      <span className="param-code">{UTM_PARAM_NAMES[key]}</span>
                    </span>
                    <span className={value ? 'param-value' : 'param-value param-value--empty'}>
                      {value ?? 'не заполнено'}
                    </span>
                  </div>
                )
              })}
              {parsed.extras.map((extra) => (
                <div className="param" key={extra.name}>
                  <span className="param-name">
                    Чужой параметр <span className="param-code">{extra.name}</span>
                  </span>
                  <span className="param-value">{extra.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass">
            <div className="qhead">
              <span className={blocking.length > 0 ? 'qchip qchip--magenta' : 'qchip qchip--done'}>
                {blocking.length > 0 ? '!' : <PixelIcon name="check" />}
              </span>
              <span className="qtitle" style={{ fontSize: 17 }}>
                {blocking.length > 0 ? 'Что сломается в отчёте' : 'Замечаний нет'}
              </span>
              {blocking.length > 0 ? (
                <button type="button" className="btn btn--sm" style={{ marginLeft: 'auto' }} onClick={fix}>
                  <PixelIcon name="wand" />
                  Починить
                </button>
              ) : null}
            </div>

            {issues.length > 0 ? (
              <IssueList issues={issues} onFix={fix} />
            ) : (
              <p className="empty">Регистр, разделители и тип трафика на месте.</p>
            )}
          </div>

          {fixed ? (
            <div className="glass">
              <div className="qhead">
                <span className="qchip">
                  <PixelIcon name="wand" />
                </span>
                <span className="qtitle" style={{ fontSize: 17 }}>
                  Исправленная ссылка
                </span>
              </div>
              <ResultCard url={fixed} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function plural(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'проблему'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'проблемы'
  return 'проблем'
}
