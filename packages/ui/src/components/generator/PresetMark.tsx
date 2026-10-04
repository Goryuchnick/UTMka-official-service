/**
 * PresetMark — знак площадки в круглом медальоне. Пиксельная манера и палитра —
 * из цветного пака сайта (RetroPixelIcon): узнаётся боковым зрением, читать
 * подпись не обязательно.
 *
 * У «Простого» вида («Точки») набор свой — плитка цвета площадки с белым
 * знаком, как значки приложений: цвет говорит, чья площадка, знак — какой
 * формат. Реклама — мегафон, пост и канал — логотип площадки. Знаки VK и
 * Telegram — из Simple Icons (CC0, simpleicons.org), остальное нарисовано здесь
 * в той же сетке 24 px.
 */

import type { ReactElement } from 'react'

import { useSkin } from '../../lib/theme'

/** Мегафон рекламы — общий для рекламных кабинетов. */
const MEGAPHONE = (
  <>
    <path d="M5.5 10.6c0-.6.4-1 1-1h2.2l6.3-3.4v11.6l-6.3-3.4H6.5c-.6 0-1-.4-1-1z" fill="#fff" />
    <path d="M8.6 14.6l1 3.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M17.6 9.4a3.6 3.6 0 0 1 0 5.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </>
)

const TILES: Record<string, ReactElement> = {
  'yandex-direct': (
    <>
      <rect width="24" height="24" rx="6" fill="#FC3F1D" />
      <path
        d="M14.8 5.6v12.8M14.8 5.6h-3.4a3.4 3.4 0 0 0 0 6.8h3.4M11.9 12.4l-3.6 6"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  ),
  'vk-ads': (
    <>
      <rect width="24" height="24" rx="6" fill="#0077FF" />
      {MEGAPHONE}
    </>
  ),
  'vk-post': (
    <>
      <rect width="24" height="24" rx="6" fill="#0077FF" />
      <path
        d="M6.79 7.3H4.05c.13 6.24 3.25 9.99 8.72 9.99h.31v-3.57c2.01.2 3.53 1.67 4.14 3.57h2.84c-.78-2.84-2.83-4.41-4.11-5.01 1.28-.74 3.08-2.54 3.51-4.98h-2.58c-.56 1.98-2.22 3.78-3.8 3.95V7.3H10.5v6.92c-1.6-.4-3.62-2.34-3.71-6.92Z"
        fill="#fff"
      />
    </>
  ),
  'telegram-channel': (
    <>
      <rect width="24" height="24" rx="6" fill="#26A5E4" />
      <path
        d="M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
        fill="#fff"
      />
    </>
  ),
  'telegram-ads': (
    <>
      <rect width="24" height="24" rx="6" fill="#26A5E4" />
      {MEGAPHONE}
    </>
  ),
  email: (
    <>
      <rect width="24" height="24" rx="6" fill="#18A058" />
      <rect x="5.5" y="7.5" width="13" height="9" rx="1.6" stroke="#fff" strokeWidth="1.8" fill="none" />
      <path d="M6.2 8.4l5.8 4.4 5.8-4.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  /* Дзен — знак-звезда с вогнутыми сторонами на тёмной плитке. Тёмная плитка в
     тёмной теме меняется местами с белым знаком (переменные в dots.css). */
  dzen: (
    <>
      <rect width="24" height="24" rx="6" fill="var(--mark-ink, #15140f)" />
      <path
        d="M12 5.5c0 3.6 2.9 6.5 6.5 6.5-3.6 0-6.5 2.9-6.5 6.5 0-3.6-2.9-6.5-6.5-6.5 3.6 0 6.5-2.9 6.5-6.5z"
        fill="var(--mark-paper, #fff)"
      />
    </>
  ),
  'offline-qr': (
    <>
      <rect width="24" height="24" rx="6" fill="var(--mark-ink, #15140f)" />
      <g fill="none" stroke="var(--mark-paper, #fff)" strokeWidth="1.6">
        <rect x="5.8" y="5.8" width="4.6" height="4.6" rx="1" />
        <rect x="13.6" y="5.8" width="4.6" height="4.6" rx="1" />
        <rect x="5.8" y="13.6" width="4.6" height="4.6" rx="1" />
      </g>
      <g fill="var(--mark-paper, #fff)">
        <rect x="13.4" y="13.4" width="2.2" height="2.2" rx=".5" />
        <rect x="16.2" y="16.2" width="2.2" height="2.2" rx=".5" />
        <rect x="16.2" y="13.4" width="2.2" height="2.2" rx=".5" />
      </g>
    </>
  ),
}

const MARKS: Record<string, ReactElement> = {
  'yandex-direct': (
    <>
      <rect x="5" y="2" width="6" height="8" rx="1" fill="#E8412F" />
      <rect x="7" y="4" width="3" height="1.4" fill="#fff" />
      <rect x="7" y="5.4" width="1.4" height="3" fill="#fff" />
      <rect x="7" y="10" width="2" height="4" fill="#FFC93C" />
    </>
  ),
  'vk-ads': (
    <>
      <rect x="1.5" y="3" width="13" height="10" rx="3" fill="#3D6FE8" />
      <path
        d="M4.5 6.5h1.3c.2 1.4.8 2.6 1.5 2.6.5 0 .4-1.5.4-2.6h1.3v1.6c.8-.2 1.4-1 1.7-1.6h1.3c-.3 1-1 1.9-1.6 2.3.7.4 1.3 1.1 1.7 2.2h-1.5c-.3-.8-.9-1.4-1.6-1.6v1.6H8.4c-2 0-3.4-1.5-3.9-4.5z"
        fill="#fff"
      />
    </>
  ),
  'vk-post': (
    <>
      <rect x="1.5" y="3" width="13" height="9" rx="2.5" fill="#5B8FB9" />
      <path d="M4 12l2.5-2H4z" fill="#5B8FB9" />
      <rect x="4" y="5.6" width="8" height="1.2" rx=".6" fill="#0a0a08" opacity=".55" />
      <rect x="4" y="8" width="5" height="1.2" rx=".6" fill="#0a0a08" opacity=".55" />
    </>
  ),
  'telegram-channel': (
    <>
      <circle cx="8" cy="8" r="6.5" fill="#5BE3D4" />
      <path
        d="M4.4 8.1l6.6-2.6c.3-.1.6.1.5.5l-1.1 5.2c-.1.4-.4.5-.7.3L8 10.2l-.9.9c-.1.1-.2.2-.4.2l.2-1.8 3.1-2.8c.1-.1 0-.2-.2-.1L6 8.6l-1.6-.5z"
        fill="#0a0a08"
      />
    </>
  ),
  'telegram-ads': (
    <>
      <circle cx="8" cy="8" r="6.5" fill="#5B8FB9" />
      <path
        d="M4.4 8.1l6.6-2.6c.3-.1.6.1.5.5l-1.1 5.2c-.1.4-.4.5-.7.3L8 10.2l-.9.9c-.1.1-.2.2-.4.2l.2-1.8 3.1-2.8c.1-.1 0-.2-.2-.1L6 8.6l-1.6-.5z"
        fill="#0a0a08"
      />
      <circle cx="12.6" cy="3.6" r="2.6" fill="#FFC93C" />
    </>
  ),
  email: (
    <>
      <rect x="1.5" y="3.5" width="13" height="9" rx="2" fill="#40A040" />
      <path
        d="M2.5 5l5.5 4 5.5-4"
        stroke="#0a0a08"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".65"
      />
    </>
  ),
  dzen: (
    <>
      <path
        d="M8 1c.3 3.4 1.1 5.4 3.5 6.2C9.1 8 8.3 10 8 13.4 7.7 10 6.9 8 4.5 7.2 6.9 6.4 7.7 4.4 8 1z"
        fill="#E05080"
      />
      <circle cx="8" cy="7.2" r="1.6" fill="#FFC93C" />
    </>
  ),
  'offline-qr': (
    <>
      <rect x="2" y="2" width="5" height="5" rx="1" fill="#5BE3D4" />
      <rect x="9" y="2" width="5" height="5" rx="1" fill="#5BE3D4" />
      <rect x="2" y="9" width="5" height="5" rx="1" fill="#5BE3D4" />
      <rect x="3.4" y="3.4" width="2.2" height="2.2" fill="#12120e" />
      <rect x="10.4" y="3.4" width="2.2" height="2.2" fill="#12120e" />
      <rect x="3.4" y="10.4" width="2.2" height="2.2" fill="#12120e" />
      <rect x="9" y="9" width="2.2" height="2.2" rx=".6" fill="#FFB000" />
      <rect x="11.8" y="11.8" width="2.2" height="2.2" rx=".6" fill="#FFB000" />
    </>
  ),
}

export function PresetMark({ id }: { id: string }) {
  const dots = useSkin().skin === 'dots'
  if (dots) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {TILES[id] ?? <rect width="24" height="24" rx="6" fill="currentColor" />}
      </svg>
    )
  }

  const mark = MARKS[id]
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {mark ?? <circle cx="8" cy="8" r="5" fill="currentColor" />}
    </svg>
  )
}
