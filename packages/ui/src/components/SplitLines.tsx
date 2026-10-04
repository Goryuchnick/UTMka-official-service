/**
 * SplitLines — «одно и то же разными словами» схемой метро, как в роликах:
 * каждое написание — своя линия своего цвета, линии сходятся в одну и
 * приходят на станцию канона. Только в «Простом» виде; в «ПРОНИН-ОС» та же
 * группа показана строкой текста.
 */

interface SplitLinesProps {
  variants: ReadonlyArray<{ value: string }>
  suggested: string
}

/** Шаг строки, px. */
const ROW = 32
/** Где линии начинают сходиться, px. */
const BEND = 28

/* Цвета линий — главы сайта. Канон идёт бирюзой продукта, как `yandex` в
   ролике, остальные — по кругу; бирюзы среди них нет, чтобы не спутать. */
const COLORS = ['#3672e9', '#cd3462', '#e8590c', '#009956', '#8f9bb0']

export function SplitLines({ variants, suggested }: SplitLinesProps) {
  const height = variants.length * ROW
  const middle = height / 2
  /* Диагонали под 45° от крайних строк должны успеть сойтись до станции. */
  const width = Math.max(132, BEND + middle + 40)
  const end = width - 10
  let other = 0
  const lines = variants.map((entry, index) => {
    const y = index * ROW + ROW / 2
    const canon = entry.value === suggested
    const color = canon ? 'var(--brand)' : COLORS[other++ % COLORS.length]
    /* Горизонталь, затем диагональ под 45° к общей линии — как у Mini Metro. */
    const join = BEND + Math.abs(y - middle)
    return { value: entry.value, y, canon, color, d: `M8 ${y}H${BEND}L${join} ${middle}H${end}` }
  })
  /* Канон рисуется последним — он сверху на общем участке. */
  const ordered = [...lines.filter((line) => !line.canon), ...lines.filter((line) => line.canon)]

  return (
    <div className="metro">
      <div className="metro__from">
        {lines.map((line) => (
          <span key={line.value} style={{ color: line.color }}>
            {line.value}
          </span>
        ))}
      </div>
      <svg className="metro__lines" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {ordered.map((line) => (
          <path key={line.value} d={line.d} stroke={line.color} />
        ))}
        {lines.map((line) => (
          <circle key={line.value} cx={8} cy={line.y} r={5} stroke={line.color} />
        ))}
        <circle className="metro__canon" cx={end} cy={middle} r={7} />
      </svg>
      <b className="metro__to">{suggested}</b>
    </div>
  )
}
