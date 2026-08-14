'use client'

/**
 * Переключатель согласия на счётчик — на странице «Что мы собираем».
 *
 * Нужен потому, что плашка показывается один раз: без этого места передумать
 * было бы негде, и «решение можно поменять в любой момент» стало бы фигурой
 * речи. Показывает текущее состояние, а не абстрактный тумблер.
 */

import { setConsent, useConsent } from '@/lib/consent'
import { PixelIcon } from '@utmka/ui'

export function ConsentSwitch() {
  const consent = useConsent()

  return (
    <div className="result-row">
      <span className="hint">
        Сейчас:{' '}
        <b>
          {consent === 'granted'
            ? 'счётчик включён'
            : consent === 'denied'
              ? 'счётчик выключен'
              : 'вы ещё не отвечали — счётчик не загружается'}
        </b>
      </span>
      <span className="spacer" />
      {consent === 'granted' ? (
        <button type="button" className="btn btn--sm" onClick={() => setConsent('denied')}>
          <PixelIcon name="close" />
          Выключить счётчик
        </button>
      ) : (
        <button type="button" className="btn btn--sm" onClick={() => setConsent('granted')}>
          <PixelIcon name="check" />
          Включить счётчик
        </button>
      )}
    </div>
  )
}
