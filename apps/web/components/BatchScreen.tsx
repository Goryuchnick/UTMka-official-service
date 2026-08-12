'use client'

/**
 * BatchScreen — пакетный режим: таблица площадок → пачка ссылок за заход
 * (ASSISTANT-SPEC §2.5).
 *
 * Вход — вставленная таблица (CSV или скопированное из Excel), общий адрес
 * и общие значения. Каждая строка проверяется отдельно: одна кривая не должна
 * прятать остальные девятнадцать.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  batchFromCsv,
  batchTemplateCsv,
  batchToCsv,
  buildBatch,
  summarizeBatch,
  type BatchRow,
} from '@utmka/core'

import { PixelIcon } from '@/components/PixelIcon'
import { useSetMascotLine } from '@/lib/mascot'

const SAMPLE = `Метка,Источник,Канал,Кампания
ВК пост,vk,social,osenniy_nabor
Директ,yandex,cpc,osenniy_nabor
Рассылка,email,email,osenniy_nabor`

export function BatchScreen() {
  const [baseUrl, setBaseUrl] = useState('')
  const [campaign, setCampaign] = useState('')
  const [table, setTable] = useState('')
  const [copied, setCopied] = useState(false)

  const rows: BatchRow[] = useMemo(() => (table.trim() ? batchFromCsv(table) : []), [table])

  const results = useMemo(
    () =>
      rows.length > 0 && baseUrl.trim()
        ? buildBatch(rows, {
            baseUrl,
            params: campaign.trim() ? { campaign: campaign.trim() } : {},
          })
        : [],
    [rows, baseUrl, campaign],
  )

  const summary = useMemo(() => summarizeBatch(results), [results])

  const line =
    results.length === 0
      ? 'Вставьте таблицу площадок — соберу ссылки пачкой.'
      : summary.withErrors > 0
        ? `Собрал ${summary.total}, но в ${summary.withErrors} есть ошибки — они помечены.`
        : `Готово: ${summary.total} ссылок, замечаний нет.`

  useSetMascotLine(line)

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(results.map((result) => result.url).join('\n'))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [results])

  const downloadCsv = useCallback(() => {
    const csv = batchToCsv(results)
    // BOM — иначе Excel открывает кириллицу кракозябрами
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'utmka-batch.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [results])

  return (
    <div className="screen-scroll">
      <div className="glass">
        <div className="qhead">
          <span className="qchip">
            <PixelIcon name="grid" />
          </span>
          <span className="qtitle qtitle--magenta">Пакетный режим</span>
        </div>

        <div className="grid2">
          <div className="field">
            <span className="field-label">Общий адрес страницы</span>
            <div className="input">
              <span className="scheme">https://</span>
              <input
                type="text"
                className="ym-disable-keys ym-hide-content"
                value={baseUrl.replace(/^https?:\/\//, '')}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="studiowelcome.ru/rostov"
                aria-label="Общий адрес страницы"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="field">
            <span className="field-label">Общая кампания (необязательно)</span>
            <div className="input">
              <input
                type="text"
                className="ym-disable-keys ym-hide-content"
                value={campaign}
                onChange={(event) => setCampaign(event.target.value)}
                placeholder="osenniy_nabor"
                aria-label="Общая кампания"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="field">
          <span className="field-label">
            Таблица площадок — вставьте из Excel или CSV. Понимаю и русские заголовки,
            и utm_source.
          </span>
          <textarea
            className="area ym-disable-keys ym-hide-content"
            value={table}
            onChange={(event) => setTable(event.target.value)}
            placeholder={SAMPLE}
            rows={7}
            aria-label="Таблица площадок"
            spellCheck={false}
          />
        </div>

        <div className="result-row">
          <button type="button" className="btn btn--sm" onClick={() => setTable(SAMPLE)}>
            <PixelIcon name="wand" />
            Вставить пример
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setTable(batchTemplateCsv())}
          >
            <PixelIcon name="grid" />
            Шаблон таблицы
          </button>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="glass">
          <div className="qhead">
            <span className={summary.withErrors > 0 ? 'qchip qchip--magenta' : 'qchip qchip--done'}>
              {summary.withErrors > 0 ? '!' : <PixelIcon name="check" />}
            </span>
            <span className="qtitle" style={{ fontSize: 17 }}>
              {summary.total} ссылок
            </span>
            <span className="hint" style={{ marginLeft: 'auto' }}>
              {summary.withErrors > 0 ? `${summary.withErrors} с ошибками · ` : ''}
              {summary.withWarnings > 0 ? `${summary.withWarnings} с предупреждениями` : 'всё чисто'}
            </span>
          </div>

          <div className="batch">
            {results.map((result, index) => {
              const worst = result.issues.find((issue) => issue.level === 'error')
                ? 'error'
                : result.issues.find((issue) => issue.level === 'warning')
                  ? 'warning'
                  : null
              return (
                <div className={`batch-row${worst ? ` batch-row--${worst}` : ''}`} key={index}>
                  <span className="batch-label">{result.label ?? `Строка ${index + 1}`}</span>
                  <span className="batch-url">{result.url}</span>
                  {worst ? (
                    <span className="batch-note">
                      {result.issues.find((issue) => issue.level === worst)?.message}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="result-row">
            <button type="button" className="btn btn--main" onClick={copyAll}>
              <PixelIcon name={copied ? 'check' : 'copy'} />
              {copied ? 'Скопировано' : 'Скопировать все ссылки'}
            </button>
            <button type="button" className="btn btn--sm" onClick={downloadCsv}>
              <PixelIcon name="save" />
              Выгрузить CSV
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
