import { openUrl } from '@tauri-apps/plugin-opener'

/**
 * Внешние ссылки — в системный браузер.
 *
 * В окне вебвью обычная `<a target="_blank">` не делает ничего: открывать
 * нечего, вкладок нет. Нажатие на «Поблагодарить» или ссылку в помощи просто
 * молчало.
 *
 * Перехват делегированный, а не правка каждой ссылки: экраны живут в общем
 * пакете и обязаны оставаться обычной разметкой — это оболочка решает, чем
 * открывать чужой адрес. Заодно правило работает и для ссылок, которые
 * появятся позже.
 *
 * ⚠️ Внутренняя навигация сюда не попадает: у неё нет схемы `http(s)` —
 * react-router водит по адресам вида `#/history`.
 */
export function catchExternalLinks(): () => void {
  const onClick = (event: MouseEvent): void => {
    // Нажатия со служебными клавишами и не левой кнопкой оставляем системе.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return

    const link = (event.target as Element | null)?.closest?.('a[href]')
    if (!(link instanceof HTMLAnchorElement)) return

    const href = link.getAttribute('href') ?? ''
    if (!/^https?:\/\//i.test(href)) return

    event.preventDefault()
    void openUrl(href).catch((error: unknown) => {
      /* Приложение от этого не ломается, но молчать нельзя: именно так
         выглядела пропажа прав (`opener:allow-open-url` без списка адресов) —
         нажатие просто ничего не делало, и причину было не найти. */
      console.warn('не удалось открыть ссылку', href, error)
    })
  }

  document.addEventListener('click', onClick)
  return () => document.removeEventListener('click', onClick)
}
