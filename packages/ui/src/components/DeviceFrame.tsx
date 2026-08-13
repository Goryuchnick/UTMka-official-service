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

import { useState, type ReactNode } from 'react'

import { Assistant } from './Assistant'
import { OnboardingGate } from './OnboardingGate'
import { MascotBar } from './Mascot'
import { PixelIcon, type IconName } from './PixelIcon'
import { useAccount } from '../lib/account'
import { useTheme } from '../lib/theme'
import { backend, NavLink, useNav } from '../shell'

interface Section {
  href: string
  label: string
  short: string
  icon: IconName
}

export const SECTIONS: readonly Section[] = [
  { href: '/', label: 'Генератор', short: 'Ссылка', icon: 'link' },
  { href: '/batch', label: 'Пакет', short: 'Пакет', icon: 'grid' },
  { href: '/parse', label: 'Разбор', short: 'Разбор', icon: 'search' },
  { href: '/history', label: 'История', short: 'История', icon: 'clock' },
  { href: '/templates', label: 'Шаблоны', short: 'Шаблоны', icon: 'star' },
]

interface DeviceFrameProps {
  children: ReactNode
  /**
   * Что хост доносит поверх рамки: в вебе сюда приезжает счётчик Метрики,
   * в десктопе — ничего. Флагом `__TAURI__` внутри разметки это же различие
   * было бы невидимо в дереве файлов.
   */
  extras?: ReactNode
}

export function DeviceFrame({ children, extras }: DeviceFrameProps) {
  const { path: pathname } = useNav()
  const { theme, toggle } = useTheme()
  const { state: account } = useAccount()
  const [menuOpen, setMenuOpen] = useState(false)

  /* Вход есть как понятие только в вебе. В десктопе `caps.auth === false`, и
     кнопка фразы вместе со строкой состояния не показываются вовсе — там
     сохранение работает всегда и приглашать не к чему. */
  const withAuth = backend.caps.auth
  const signedIn = account === 'member'

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
              <NavLink
                key={section.href}
                to={section.href}
                className="navbtn"
                aria-current={isCurrent(section.href) ? 'page' : undefined}
              >
                <PixelIcon name={section.icon} />
                {section.label}
              </NavLink>
            ))}
          </nav>

          <span className="spacer" />

          <a
            href="https://alex-pronin.ru/donate"
            target="_blank"
            rel="noopener noreferrer"
            className="iconbtn iconbtn--heart"
            title="Поблагодарить автора"
            aria-label="Поблагодарить автора"
          >
            <PixelIcon name="heart" />
          </a>
          <NavLink to="/help" className="iconbtn" title="Помощь" aria-label="Помощь">
            <PixelIcon name="help" />
          </NavLink>
          <button
            type="button"
            className="iconbtn"
            onClick={toggle}
            title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
          >
            <PixelIcon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
          {withAuth ? (
            <NavLink to="/login" className="keybtn">
              <PixelIcon name="key" />
              <span className="keybtn__full">{signedIn ? 'Вы вошли' : 'Кодовая фраза'}</span>
              <span className="keybtn__short">{signedIn ? 'Вход' : 'Фраза'}</span>
            </NavLink>
          ) : null}
        </div>

        <MascotBar />

        {children}

        {backend.assistant ? <Assistant /> : null}
        <OnboardingGate />
        {extras}

        <div className="statusbar">
          {withAuth ? (
            <NavLink to="/login" className="sb-item">
              <span className={`sb-dot${signedIn ? '' : ' sb-dot--off'}`} aria-hidden="true" />
              {signedIn ? 'Фраза при вас' : 'Гость'}
            </NavLink>
          ) : (
            <span className="sb-item">
              <span className="sb-dot" aria-hidden="true" />
              Локальный режим
            </span>
          )}
          <span className="sb-item sb-quota">
            Сохранение: <b>{withAuth && !signedIn ? 'нужна фраза' : 'включено'}</b>
          </span>
          <span className="spacer" />
          <a
            className="sb-item"
            href="https://alex-pronin.ru/donate"
            target="_blank"
            rel="noopener noreferrer"
          >
            Поблагодарить
          </a>
          <span className="sb-item">UTMKA 3.0</span>
        </div>
      </div>

      {/* Мобильный док: сворачивается в кнопку, как меню на главной сайта. */}
      <div className="mdock-wrap">
        <nav className="mdock" aria-label="Разделы">
          {SECTIONS.map((section) => (
            <NavLink
              key={section.href}
              to={section.href}
              aria-current={isCurrent(section.href) ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <PixelIcon name={section.icon} />
              {section.short}
            </NavLink>
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
