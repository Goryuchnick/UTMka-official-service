/**
 * Пример готовой ссылки — разметкой, а не картинкой: так его можно выделить и
 * скопировать, и так его читает поисковик.
 */

import { PixelIcon } from '@utmka/ui'

export interface Example {
  base: string
  params: readonly (readonly [string, string])[]
}

export function LinkExample({ example }: { example: Example }) {
  return (
    <section className="glass lp-block">
      <div className="qhead">
        <span className="qchip">
          <PixelIcon name="link" />
        </span>
        <h2 className="qtitle qtitle--amber">Как выглядит готовая ссылка</h2>
      </div>
      <div className="result-url">
        <span>{example.base}</span>
        {example.params.map(([key, value], index) => (
          <span key={key}>
            <span className="k">{`${index === 0 ? '?' : '&'}${key}=`}</span>
            <span className="v">{value}</span>
          </span>
        ))}
      </div>
    </section>
  )
}
