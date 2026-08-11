'use client'

/**
 * DeviceFrame — рамка устройства «ПРОНИН-ОС» для инструмента.
 *
 * Шапка экрана состоит из двух планок: разделы с инструментами и планка
 * помощника под ней. Обе стеклянные, прибиты к верхней кромке экрана и
 * не зависят от содержимого — контент прокручивается под ними.
 *
 * На мобилке разделы из шапки убраны совсем: они живут в нижнем доке,
 * который сворачивается в кнопку — как меню на главной сайта.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { MascotBar } from './Mascot'
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
  const [menuOpen, setMenuOpen] = useState(false)

  const isCurrent = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div className={`dev${menuOpen ? '' : ' dev--menuclosed'}`}>
      <div className="screen">
        <div className="crt" aria-hidden="true" />

        <div className="topbar">
          {/* На мобилке этот блок скрыт — разделы уезжают в нижний док. */}
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
            <span className="keybtn__full">Кодовая фраза</span>
            <span className="keybtn__short">Фраза</span>
          </Link>
        </div>

        <MascotBar />

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

      {/* Мобильный док: сворачивается в кнопку, как меню на главной сайта. */}
      <div className="mdock-wrap">
        <nav className="mdock" aria-label="Разделы">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              aria-current={isCurrent(section.href) ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <PixelIcon name={section.icon} />
              {section.short}
            </Link>
          ))}
        </nav>
      </div>

      <button
        type="button"
        className="mdock-fab"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Свернуть меню' : 'Открыть меню'}
      >
        <PixelIcon name={menuOpen ? 'check' : 'grid'} />
        {menuOpen ? 'Свернуть' : 'Разделы'}
      </button>
    </div>
  )
}
