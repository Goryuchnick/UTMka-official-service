/**
 * Знак UTMka — два сцепленных звена.
 *
 * Метка и есть звено между объявлением и отчётом: потерялось звено — потерялся
 * источник. Рисунок свой, на сетке 16×16 прямоугольниками: интерфейс пиксельный,
 * и знак обязан быть таким же на любом размере, без сглаживания.
 *
 * Верхнее звено амбером, нижнее бирюзой и с зазором в месте пересечения —
 * без зазора это читалось бы как две наложенные окружности, а не цепь.
 */

interface ChainMarkProps {
  size?: number
  className?: string
}

export function ChainMark({ size = 16, className }: ChainMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="var(--hv2-primary)">
        <rect x="3" y="0" width="5" height="1" />
        <rect x="2" y="1" width="7" height="1" />
        <rect x="1" y="2" width="9" height="1" />
        <rect x="0" y="3" width="4" height="1" />
        <rect x="7" y="3" width="4" height="1" />
        <rect x="0" y="4" width="3" height="1" />
        <rect x="8" y="4" width="3" height="1" />
        <rect x="0" y="5" width="3" height="1" />
        <rect x="8" y="5" width="3" height="1" />
        <rect x="0" y="6" width="3" height="1" />
        <rect x="8" y="6" width="3" height="1" />
        <rect x="0" y="7" width="4" height="1" />
        <rect x="7" y="7" width="4" height="1" />
        <rect x="1" y="8" width="9" height="1" />
        <rect x="2" y="9" width="7" height="1" />
        <rect x="3" y="10" width="5" height="1" />
      </g>
      <g fill="var(--hv2-teal)">
        <rect x="12" y="5" width="1" height="1" />
        <rect x="12" y="6" width="2" height="1" />
        <rect x="12" y="7" width="3" height="1" />
        <rect x="12" y="8" width="4" height="1" />
        <rect x="13" y="9" width="3" height="1" />
        <rect x="13" y="10" width="3" height="1" />
        <rect x="13" y="11" width="3" height="1" />
        <rect x="5" y="12" width="4" height="1" />
        <rect x="12" y="12" width="4" height="1" />
        <rect x="6" y="13" width="9" height="1" />
        <rect x="7" y="14" width="7" height="1" />
        <rect x="8" y="15" width="5" height="1" />
      </g>
    </svg>
  )
}
