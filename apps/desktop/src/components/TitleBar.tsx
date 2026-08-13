import { useCallback, useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { PixelIcon } from '@utmka/ui'

/**
 * Своя строка заголовка вместо системной рамки Windows.
 *
 * Рамка ОС спорила с оболочкой «ПРОНИН-ОС»: у приложения свой корпус
 * устройства, а поверх него шла чужая синяя полоса с чужими кнопками.
 * Окно объявлено без декораций (`decorations: false`), и заголовок теперь
 * часть интерфейса.
 *
 * ⚠️ Вместе с рамкой теряются и системные жесты, поэтому здесь они
 * возвращаются руками: перетаскивание — через `data-tauri-drag-region`,
 * разворот по двойному щелчку и три кнопки — через API окна. Без этого
 * окно нельзя ни двигать, ни закрыть.
 */
/**
 * Мы внутри окна Tauri?
 *
 * В dev-режиме тот же фронт открывается и обычным браузером по адресу
 * `localhost:1420` — там моста нет, и `getCurrentWindow()` падает на чтении
 * своих метаданных. Заголовок обязан это пережить: иначе вся страница уходит
 * в белый экран из-за компонента, который в браузере и не нужен.
 */
const inWindow = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!inWindow) return undefined

    const self = getCurrentWindow()
    let alive = true

    void self.isMaximized().then((value) => {
      if (alive) setMaximized(value)
    })

    // Окно разворачивают и мышью за край — состояние кнопки обязано следовать.
    const unlisten = self.onResized(() => {
      void self.isMaximized().then((value) => {
        if (alive) setMaximized(value)
      })
    })

    return () => {
      alive = false
      void unlisten.then((off) => off())
    }
  }, [])

  const minimize = useCallback(() => {
    if (inWindow) void getCurrentWindow().minimize()
  }, [])
  const toggle = useCallback(() => {
    if (inWindow) void getCurrentWindow().toggleMaximize()
  }, [])
  const close = useCallback(() => {
    if (inWindow) void getCurrentWindow().close()
  }, [])

  return (
    <div className="titlebar" data-tauri-drag-region onDoubleClick={toggle}>
      <span className="titlebar__mark" data-tauri-drag-region>
        <PixelIcon name="link" />
      </span>
      <span className="titlebar__name" data-tauri-drag-region>
        UTMka
      </span>
      <span className="titlebar__hint" data-tauri-drag-region>
        конструктор UTM-меток
      </span>

      <span className="spacer" data-tauri-drag-region />

      <div className="titlebar__acts">
        <button type="button" className="wbtn" onClick={minimize} aria-label="Свернуть" title="Свернуть">
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 5h10" />
          </svg>
        </button>
        <button
          type="button"
          className="wbtn"
          onClick={toggle}
          aria-label={maximized ? 'Восстановить размер' : 'Развернуть'}
          title={maximized ? 'Восстановить размер' : 'Развернуть'}
        >
          {maximized ? (
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2.5 0.5h7v7M0.5 2.5h7v7h-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M0.5 0.5h9v9h-9z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="wbtn wbtn--close"
          onClick={close}
          aria-label="Закрыть"
          title="Закрыть"
        >
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" />
          </svg>
        </button>
      </div>
    </div>
  )
}
