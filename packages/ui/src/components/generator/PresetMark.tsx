/**
 * PresetMark — знак площадки в круглом медальоне. Пиксельная манера и палитра —
 * из цветного пака сайта (RetroPixelIcon): узнаётся боковым зрением, читать
 * подпись не обязательно.
 */

import type { ReactElement } from 'react'

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
  const mark = MARKS[id]
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {mark ?? <circle cx="8" cy="8" r="5" fill="currentColor" />}
    </svg>
  )
}
