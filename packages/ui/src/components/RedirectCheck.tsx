'use client'

/**
 * RedirectCheck — «дойдут ли метки до страницы».
 *
 * Самая незаметная потеря разметки: ссылка работает, страница открывается,
 * а в отчёте пусто — потому что по дороге стоял редирект, отрезавший query.
 * Так ведут себя сокращатели, «умные» ссылки CRM и часть рекламных кабинетов.
 * Глазами это не проверить: браузер показывает конечный адрес уже без меток.
 *
 * Считает сервер (`/api/redirect-check`) — из браузера чужой домен не опросить,
 * CORS не пустит. Логика цепочки и предохранители — в ядре и `lib/redirect-fetch`.
 */

import { useCallback, useState } from 'react'
import { backendMessage, explainFailure, UTM_PARAM_NAMES, type RedirectReport } from '@utmka/core'

import { PixelIcon } from './PixelIcon'
import { backend } from '../shell'
import { sayAbout } from '../lib/mascot-lines'

interface RedirectCheckProps {
  /** Адрес, который разбирает экран. Проверяем ровно его. */
  url: string
}

export function RedirectCheck({ url }: RedirectCheckProps) {
  const [report, setReport] = useState<RedirectReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const check = useCallback(async () => {
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const next = await backend.net.checkRedirects(url)
      setReport(next)
      sayAbout(next.lost.length > 0 || next.failure ? 'redirectLost' : 'redirectOk')
    } catch (error) {
      setError(backendMessage(error))
    } finally {
      setLoading(false)
    }
  }, [url])

  return (
    <div className="glass">
      <div className="qhead">
        <span className="qchip qchip--teal">
          <PixelIcon name="shield" />
        </span>
        <span className="qtitle qtitle--teal">Дойдут ли метки</span>
        <button
          type="button"
          className="btn btn--sm"
          style={{ marginLeft: 'auto' }}
          onClick={check}
          disabled={loading}
        >
          <PixelIcon name="search" />
          {loading ? 'Проверяю…' : report ? 'Проверить снова' : 'Проверить'}
        </button>
      </div>

      {!report && !error && !loading ? (
        <p className="hint">
          Пройдём по переадресациям с сервера и сверим метки на входе и на выходе. Если по дороге
          стоит редирект, отрезающий параметры, переходы в отчёте окажутся без источника —
          а ссылка при этом работает как ни в чём не бывало.
        </p>
      ) : null}

      {error ? <p className="hint hint--error">{error}</p> : null}

      {report ? <Report report={report} /> : null}
    </div>
  )
}

function Report({ report }: { report: RedirectReport }) {
  const { hops, finalUrl, lost, failure, failureUrl } = report

  return (
    <>
      {hops.length > 0 ? (
        <ol className="hops">
          {hops.map((hop, index) => (
            <li className="hop" key={`${hop.url}-${index}`}>
              <span className={statusClass(hop.status)}>{hop.status}</span>
              <span className="hop-url">{hop.url}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {failure ? (
        <div className="verdict verdict--bad">
          <p className="verdict-title">Проверка прервалась</p>
          <p className="verdict-text">{explainFailure(failure)}</p>
          {failureUrl ? <p className="hop-url">{failureUrl}</p> : null}
        </div>
      ) : lost.length > 0 ? (
        <div className="verdict verdict--bad">
          <p className="verdict-title">
            {lost.length === 1 ? 'Метка не доехала' : 'Метки не доехали'}
          </p>
          <p className="verdict-text">
            До конечной страницы не дожили: {lost.map((key) => UTM_PARAM_NAMES[key]).join(', ')}.
            Переходы по этой ссылке аналитика зачтёт как прямые заходы — источник, кампанию
            и стоимость привлечения по ним посчитать будет нечем. Чинится на стороне того, кто
            держит переадресацию: она обязана переносить query-строку целиком.
          </p>
        </div>
      ) : (
        <div className="verdict verdict--ok">
          <p className="verdict-title">
            {hops.length > 1 ? 'Метки пережили переадресацию' : 'Переадресаций нет'}
          </p>
          <p className="verdict-text">
            {hops.length > 1
              ? 'Значения на конечной странице те же, что в исходной ссылке — отчёт получит источник целиком.'
              : 'Ссылка ведёт прямо на страницу, терять метки по дороге негде.'}
          </p>
        </div>
      )}

      {/* Только когда дошли: при обрыве `finalUrl` — это адрес, на котором
          мы остановились, и подпись «конечный» выдала бы его за страницу,
          до которой доехали. Он и так показан строкой выше. */}
      {!failure && finalUrl ? (
        <div className="param">
          <span className="param-name">Конечный адрес</span>
          <span className="param-value">{finalUrl}</span>
        </div>
      ) : null}
    </>
  )
}

/** Код ответа красим смыслом: перенаправление, успех, беда. */
function statusClass(status: number): string {
  if (status >= 300 && status < 400) return 'hop-status hop-status--redirect'
  if (status >= 400) return 'hop-status hop-status--bad'
  return 'hop-status hop-status--ok'
}
