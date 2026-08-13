/**
 * UrlPreview — собранная ссылка с подсветкой: служебные части приглушены,
 * значения амбером, подстановки площадок бирюзой.
 *
 * Бирюза здесь несёт смысл: видно, что `{keyword}` уцелел и не превратился
 * в `%7Bkeyword%7D` — именно эта ошибка стоит потерянной семантики за период.
 */

import { Fragment } from 'react'

interface UrlPreviewProps {
  url: string
}

const PLACEHOLDER = /\{[a-z_0-9]+\}/gi

/** Значение параметра: подстановки — бирюзой, остальное — амбером. */
function renderValue(value: string, keyPrefix: string) {
  const parts: Array<{ text: string; placeholder: boolean }> = []
  let last = 0

  for (const match of value.matchAll(PLACEHOLDER)) {
    const at = match.index ?? 0
    if (at > last) parts.push({ text: value.slice(last, at), placeholder: false })
    parts.push({ text: match[0], placeholder: true })
    last = at + match[0].length
  }
  if (last < value.length) parts.push({ text: value.slice(last), placeholder: false })

  return parts.map((part, i) => (
    <span key={`${keyPrefix}-${i}`} className={part.placeholder ? 'ph' : 'v'}>
      {part.text}
    </span>
  ))
}

export function UrlPreview({ url }: UrlPreviewProps) {
  const cut = url.indexOf('?')
  if (cut === -1) return <div className="result-url">{url}</div>

  const base = url.slice(0, cut)
  const query = url.slice(cut + 1)
  const pairs = query.split('&')

  return (
    <div className="result-url">
      {base}
      <span className="k">?</span>
      {pairs.map((pair, index) => {
        const eq = pair.indexOf('=')
        const name = eq === -1 ? pair : pair.slice(0, eq)
        const value = eq === -1 ? '' : pair.slice(eq + 1)
        return (
          <Fragment key={`${name}-${index}`}>
            {index > 0 && <span className="k">&amp;</span>}
            <span className="k">{name}=</span>
            {renderValue(value, `${name}-${index}`)}
          </Fragment>
        )
      })}
    </div>
  )
}
