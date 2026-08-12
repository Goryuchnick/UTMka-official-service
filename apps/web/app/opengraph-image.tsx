import { ImageResponse } from 'next/og'

/**
 * OG-плашка инструмента. Рисуется на лету, без картинок и внешних шрифтов:
 * Amber CRT-фон, пиксельная сетка, имя и одна строка о сути.
 *
 * Шрифты берём системные — next/font сюда не подключить (рантайм OG не тот),
 * а тянуть файл ради плашки не стоит: моноширинный набор и так узнаваем.
 */

export const alt = 'UTMka — конструктор UTM-меток'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BG = '#0a0a08'
const FG = '#ece8df'
const AMBER = '#ffb000'
const MUTED = '#b09a5c'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: BG,
          // Сетка «монитора» — тот же приём, что у CRT в интерфейсе.
          backgroundImage:
            'linear-gradient(rgba(255,176,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,176,0,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          padding: '0 84px',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: MUTED, fontSize: 26 }}>
          <div style={{ width: 14, height: 14, background: AMBER }} />
          utmka.alex-pronin.ru
        </div>

        <div
          style={{
            marginTop: 26,
            fontSize: 96,
            fontWeight: 700,
            color: AMBER,
            letterSpacing: '-0.02em',
          }}
        >
          UTMka
        </div>

        <div style={{ marginTop: 18, fontSize: 40, color: FG, lineHeight: 1.35, maxWidth: 900 }}>
          Собирает UTM-ссылки и объясняет, что сломается в отчёте
        </div>

        <div style={{ marginTop: 34, display: 'flex', gap: 14, color: MUTED, fontSize: 25 }}>
          <span style={{ border: `2px solid ${MUTED}`, padding: '8px 16px' }}>бесплатно</span>
          <span style={{ border: `2px solid ${MUTED}`, padding: '8px 16px' }}>без регистрации</span>
          <span style={{ border: `2px solid ${MUTED}`, padding: '8px 16px' }}>и версия для ПК</span>
        </div>
      </div>
    ),
    size,
  )
}
