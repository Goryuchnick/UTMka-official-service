import { invoke } from '@tauri-apps/api/core'

/**
 * Настройки интерфейса — копией в базу.
 *
 * Читает их фронт по-прежнему из `localStorage` и синхронно: тема ставится до
 * первой отрисовки, иначе светлая мигает тёмной. Но профиль вебвью живёт рядом
 * с приложением и теряется при переустановке или чистке кэша — а «тема слетела
 * после обновления» читается как поломка, а не как особенность хранилища.
 *
 * Поэтому здесь только запись: каждое изменение уходит в таблицу `settings`,
 * а обратно значения возвращает Rust при старте окна.
 *
 * Своих событий у `localStorage` для той же вкладки нет (`storage` срабатывает
 * только у соседних), поэтому слушаем то, что интерфейс шлёт сам: смену темы
 * атрибутом на `<html>` и события режима и вида списков.
 */

/** Ключи, которые имеет смысл помнить между запусками. */
const KEYS = [
  'utmka.theme',
  'utmka.mode',
  'utmka.view.history',
  'utmka.view.templates',
  'utmka.onboarding.v2',
] as const

function push(key: string): void {
  let value: string | null = null
  try {
    value = localStorage.getItem(key)
  } catch {
    return
  }
  if (value === null) return

  void invoke('settings_set', { key, value }).catch(() => {
    /* База недоступна — настройка всё равно осталась в localStorage и работает
       до конца сессии. Ронять из-за этого интерфейс незачем. */
  })
}

function pushAll(): void {
  for (const key of KEYS) push(key)
}

export function syncSettings(): () => void {
  // Тема живёт атрибутом на <html> — его и слушаем.
  const observer = new MutationObserver(() => push('utmka.theme'))
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  const onMode = () => push('utmka.mode')
  const onView = () => {
    push('utmka.view.history')
    push('utmka.view.templates')
  }
  const onOnboarding = () => push('utmka.onboarding.v2')

  window.addEventListener('utmka:mode', onMode)
  window.addEventListener('utmka:view', onView)
  window.addEventListener('utmka:onboarding', onOnboarding)

  /* Первый прогон — на случай, когда база пустая, а localStorage уже что-то
     помнит: например, приложение обновилось со старой версии. */
  pushAll()

  // Страховка на выход: события можно пропустить, закрытие окна — нет.
  const onLeave = () => pushAll()
  window.addEventListener('beforeunload', onLeave)

  return () => {
    observer.disconnect()
    window.removeEventListener('utmka:mode', onMode)
    window.removeEventListener('utmka:view', onView)
    window.removeEventListener('utmka:onboarding', onOnboarding)
    window.removeEventListener('beforeunload', onLeave)
  }
}
