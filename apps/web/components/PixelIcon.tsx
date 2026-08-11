/**
 * PixelIcon — stroke-глифы 16×16 из пака сайта (pronin-alex/components/ui/PixelIcon.tsx).
 * Перенесены только те, что нужны инструменту; рисунок и толщина линий 1:1.
 *
 * Сторонние icon-библиотеки в проект не тянем — правило воркспейса.
 */

import type { ReactElement } from 'react'

export type IconName =
  | 'link'
  | 'copy'
  | 'save'
  | 'search'
  | 'check'
  | 'clock'
  | 'qr'
  | 'scissors'
  | 'shield'
  | 'grid'
  | 'star'
  | 'help'
  | 'key'
  | 'calendar'
  | 'wand'
  | 'trash'
  | 'moon'
  | 'sun'
  | 'close'
  | 'share'
  | 'mail'

const GLYPHS: Record<IconName, ReactElement> = {
  link: (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <path d="M7 9.5a4 4 0 005.6.4l2-2a4 4 0 00-5.7-5.6l-1 1" />
      <path d="M9 6.5a4 4 0 00-5.6-.4l-2 2a4 4 0 005.7 5.6l1-1" />
    </g>
  ),
  copy: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <rect x="5" y="5" width="8" height="9" rx="1" />
      <path d="M3 11V3h8" strokeLinecap="round" />
    </g>
  ),
  save: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <path d="M2 2h9l3 3v9H2V2z" strokeLinejoin="round" />
      <rect x="5" y="2" width="5" height="4" strokeWidth="1.3" />
      <rect x="4" y="9" width="8" height="5" strokeWidth="1.3" />
    </g>
  ),
  search: (
    <g stroke="currentColor" fill="none">
      <circle cx="7" cy="7" r="4.5" strokeWidth="1.5" />
      <path d="M10.5 10.5l3 3" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  check: (
    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  clock: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.5l2 1.5" strokeLinecap="round" />
    </g>
  ),
  qr: (
    <g stroke="currentColor" strokeWidth="1.3" fill="none">
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <path d="M9 9h2v2H9zM12 12h2v2h-2zM9 13h2M13 9h1" />
    </g>
  ),
  scissors: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <circle cx="4" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M5.5 10.5L11 3M10.5 10.5L5 3" strokeLinecap="round" />
    </g>
  ),
  shield: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <path d="M8 2l5 2v4c0 3-2.2 5.2-5 6-2.8-.8-5-3-5-6V4l5-2z" strokeLinejoin="round" />
      <path d="M5.8 8l1.6 1.6L10.4 6.6" strokeLinecap="round" />
    </g>
  ),
  grid: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </g>
  ),
  star: <path d="M8 2l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 11l-3.7 2.5 1.4-4.3L2 6.5h4.5z" fill="currentColor" />,
  help: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <circle cx="8" cy="8" r="6" />
      <path d="M6.2 6.2a1.9 1.9 0 013.6.7c0 1.3-1.8 1.5-1.8 2.6" strokeLinecap="round" />
      <circle cx="8" cy="12" r=".7" fill="currentColor" stroke="none" />
    </g>
  ),
  key: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <circle cx="5" cy="8" r="3" />
      <path d="M8 8h6M12 8v2.5M14 8v2" strokeLinecap="round" />
    </g>
  ),
  calendar: (
    <g stroke="currentColor" strokeWidth="1.3" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <path d="M2 6.5h12M5.5 2v2.5M10.5 2v2.5" strokeLinecap="round" />
    </g>
  ),
  wand: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <path d="M3 13L11 5" strokeLinecap="round" />
      <path d="M10 2.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8L7.5 5l1.8-.7z" fill="currentColor" stroke="none" />
      <path d="M13.2 9.4l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z" fill="currentColor" stroke="none" />
    </g>
  ),
  trash: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <path d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.7 9.5h5.6L11.5 4" strokeLinejoin="round" />
    </g>
  ),
  moon: (
    <path d="M12.5 9.6A5.2 5.2 0 016.4 3.5a5.5 5.5 0 106.1 6.1z" fill="currentColor" />
  ),
  sun: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M12.4 3.6l-1.3 1.3M4.9 11.1l-1.3 1.3" strokeLinecap="round" />
    </g>
  ),
  close: (
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </g>
  ),
  share: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <circle cx="12" cy="3.5" r="2" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="12" cy="12.5" r="2" />
      <path d="M10.2 4.5L5.8 6.9M5.8 9.1l4.4 2.4" />
    </g>
  ),
  mail: (
    <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round">
      <rect x="1.5" y="3.5" width="13" height="9" />
      <path d="M1.5 4.5L8 9l6.5-4.5" />
    </g>
  ),
}

interface PixelIconProps {
  name: IconName
  size?: number
  className?: string
}

export function PixelIcon({ name, size, className }: PixelIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[name]}
    </svg>
  )
}
