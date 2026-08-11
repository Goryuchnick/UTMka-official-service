/**
 * Soon — честная заглушка раздела, пока он не собран.
 *
 * Нужна, чтобы навигация не вела в 404 на промежуточных этапах ШАГА 3.
 * Удаляется по мере готовности экранов.
 */

import { Mascot } from '@/components/Mascot'

interface SoonProps {
  title: string
  line: string
  what: string
}

export function Soon({ title, line, what }: SoonProps) {
  return (
    <div className="screen-scroll">
      <Mascot line={line} />
      <div className="glass">
        <div className="qhead">
          <span className="qchip">…</span>
          <span className="qtitle">{title}</span>
        </div>
        <p className="hint">{what}</p>
      </div>
    </div>
  )
}
