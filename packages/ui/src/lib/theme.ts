'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Тема интерфейса. Хранится в localStorage и стемпится атрибутом на <html> —
 * тем же способом, что на сайте (ключ свой, выбор между проектами не шарится).
 *
 * Снапшот — примитив (строка), поэтому кэшировать его не нужно; для массивов
 * и объектов кэш по raw-строке обязателен, иначе бесконечный ре-рендер.
 */

export type Theme = 'dark' | 'light'

export const THEME_KEY = 'utmka.theme'

/**
 * Оформление — вторая ось поверх темы. `os` — «ПРОНИН-ОС» (корпус, CRT,
 * стекло), `dots` — система «Точки» со страниц сайта для бизнеса: светлый
 * фон, поле точек, шрифты Yantar, рамок и карточек нет. Тема (светлая или
 * тёмная) у каждого оформления своя, но хранится одним ключом.
 */
export type Skin = 'os' | 'dots'

export const SKIN_KEY = 'utmka.skin'

/** Скрипт no-FOUC: ставит тему и оформление до первой отрисовки. Встраивается в <head>. */
export const THEME_BOOTSTRAP = `(function(){try{var d=document.documentElement,t=localStorage.getItem('${THEME_KEY}'),s=localStorage.getItem('${SKIN_KEY}');if(t==='light'||t==='dark'){d.dataset.theme=t}if(s==='dots'){d.dataset.skin=s}}catch(e){}})()`

function read(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function readSkin(): Skin {
  if (typeof document === 'undefined') return 'os'
  return document.documentElement.dataset.skin === 'dots' ? 'dots' : 'os'
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-skin'] })
  window.addEventListener('storage', onChange)
  return () => {
    observer.disconnect()
    window.removeEventListener('storage', onChange)
  }
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, read, () => 'dark' as Theme)

  const toggle = useCallback(() => {
    const next: Theme = read() === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // приватный режим — тема просто не переживёт перезагрузку
    }
  }, [])

  return { theme, toggle }
}

/** Событие «оформление выбрано»: выбор того же вида, что уже стоит, атрибут не меняет. */
const CHOICE_EVENT = 'utmka:skin-choice'

/**
 * Включить оформление и запомнить выбор. Ключ `SKIN_KEY` в хранилище — это и
 * есть отметка «человек выбрал»: без него при первом визите показывается окно
 * выбора (`SkinChooser`). Десктоп переносит ключ в свою базу (`settings-sync`).
 */
export function applySkin(next: Skin): void {
  const root = document.documentElement
  if (next === 'dots') {
    root.dataset.skin = 'dots'
    /* «Точки» рождены светлыми: тёмная у них — вариант, а не основа.
       Без атрибута «ПРОНИН-ОС» тёмная, и переключатель темы решил бы,
       что светлая уже включена, — поэтому ставим её явно. */
    root.dataset.theme = 'light'
  } else {
    delete root.dataset.skin
    /* И наоборот: «Гиковый» — тёмный терминал, каким его показывает окно
       выбора. Из «Точек» тема пришла бы светлой. */
    root.dataset.theme = 'dark'
  }
  try {
    localStorage.setItem(SKIN_KEY, next)
    localStorage.setItem(THEME_KEY, root.dataset.theme ?? 'dark')
  } catch {
    // приватный режим — оформление не переживёт перезагрузку
  }
  window.dispatchEvent(new Event(CHOICE_EVENT))
}

export function useSkin(): { skin: Skin; toggle: () => void } {
  const skin = useSyncExternalStore(subscribe, readSkin, () => 'os' as Skin)

  const toggle = useCallback(() => {
    applySkin(readSkin() === 'dots' ? 'os' : 'dots')
  }, [])

  return { skin, toggle }
}

function readChosen(): boolean {
  try {
    return localStorage.getItem(SKIN_KEY) !== null
  } catch {
    return true // без хранилища спрашивать бессмысленно — ответ всё равно не запомнится
  }
}

function subscribeChoice(onChange: () => void): () => void {
  window.addEventListener(CHOICE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHOICE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Выбрал ли человек оформление. На сервере — «да»: окно выбора рисуется только в браузере. */
export function useSkinChosen(): boolean {
  return useSyncExternalStore(subscribeChoice, readChosen, () => true)
}
