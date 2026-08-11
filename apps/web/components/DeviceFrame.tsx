'use client'

/**
 * DeviceFrame — рамка устройства «ПРОНИН-ОС» для инструмента.
 *
 * Панель разделов приклеена к верхней кромке экрана, строка состояния — к нижней;
 * обе стеклянные и размывают контент под собой. На мобилке разделы уезжают
 * в плавающий док под экраном (как DeviceShell на сайте).
 *
 * Инструменты (QR, короткая ссылка, проверка) живут в той же панели — экран
 * остаётся под одно главное действие.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { PixelIcon, type IconName } from './PixelIcon'
import { useTheme } from '@/lib/theme'

interface Section {
  href: string
  label: string
  short: string
  icon: IconName
}

const SECTIONS: readonly Section[] = [
  { href: '/', label: 'Генератор', short: 'Ссылка', icon: 'link' },
  { href: '/batch', label: 'Пакет', short: 'Пакет', icon: 'grid' },
  { href: '/parse', label: 'Разбор', short: 'Разбор', icon: 'search' },
  { href: '/history', label: 'История', short: 'История', icon: 'clock' },
  { href: '/templates', label: 'Шаблоны', short: 'Шаблоны', icon: 'star' },
]

interface DeviceFrameProps {
  children: ReactNode
}

export function DeviceFrame({ children }: DeviceFrameProps) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  const isCurrent = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div className="dev">
      <div className="screen">
        <div className="crt" aria-hidden="true" />

        <div className="topbar">
          <nav className="nav" aria-label="Разделы">
            {SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="navbtn"
                aria-current={isCurrent(section.href) ? 'page' : undefined}
              >
                <PixelIcon name={section.icon} />
                {section.label}
              </Link>
            ))}
          </nav>

          <span className="spacer" />

          <Link href="/help" className="iconbtn" title="Помощь" aria-label="Помощь">
            <PixelIcon name="help" />
          </Link>
          <button
            type="button"
            className="iconbtn"
            onClick={toggle}
            title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
          >
            <PixelIcon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
          <Link href="/login" className="keybtn">
            <PixelIcon name="key" />
            Кодовая фраза
          </Link>
        </div>

        {children}

        <div className="statusbar">
          <span className="sb-item">
            <span className="sb-dot sb-dot--off" aria-hidden="true" />
            Гость
          </span>
          <span className="sb-item sb-quota">
            Помощник: <b>нужна фраза</b>
          </span>
          <span className="spacer" />
          <span className="sb-item">UTMKA 3.0</span>
        </div>
      </div>

      <nav className="mdock" aria-label="Разделы">
        {SECTIONS.slice(0, 4).map((section) => (
          <Link
            key={section.href}
            href={section.href}
            aria-current={isCurrent(section.href) ? 'page' : undefined}
          >
            <PixelIcon name={section.icon} />
            {section.short}
          </Link>
        ))}
      </nav>
    </div>
  )
}
