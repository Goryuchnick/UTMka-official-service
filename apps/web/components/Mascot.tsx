/**
 * Mascot — залипающая шапка экрана: пиксельный помощник и его реплика.
 *
 * Липнет к верхней кромке .screen-scroll (правило .head в globals.css).
 * ⚠️ При правках раскладки следить, чтобы у родителя не появился
 * `min-height: 0` без `overflow` — он рвёт containing block у sticky,
 * и шапка молча перестаёт липнуть (грабли редизайна pronin-alex).
 *
 * Спрайт — временный: настоящий приедет из components/mascot/MascotSprite.tsx
 * сайта при подключении ассетов.
 */

interface MascotProps {
  /** Реплика помощника. Тексты живут у вызывающего экрана. */
  line: string
}

export function Mascot({ line }: MascotProps) {
  return (
    <div className="head">
      <svg className="mascot" viewBox="0 0 12 12" role="img" aria-label="Помощник UTMka">
        <rect width="12" height="12" fill="var(--hv2-card)" />
        <g fill="var(--hv2-primary)">
          <rect x="3" y="1" width="6" height="1" />
          <rect x="2" y="2" width="8" height="1" />
          <rect x="2" y="3" width="1" height="4" />
          <rect x="9" y="3" width="1" height="4" />
          <rect x="3" y="7" width="6" height="1" />
          <rect x="4" y="8" width="4" height="1" />
          <rect x="3" y="9" width="6" height="3" />
        </g>
        <g fill="var(--hv2-bg)">
          <rect x="4" y="4" width="1" height="2" />
          <rect x="7" y="4" width="1" height="2" />
          <rect x="5" y="10" width="2" height="1" />
        </g>
        <rect x="3" y="3" width="6" height="1" fill="var(--hv2-course)" />
      </svg>
      <p className="bubble" aria-live="polite">
        {line}
      </p>
    </div>
  )
}
