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
import { PRODUCT_VERSION } from '@utmka/core'

import { Assistant } from './Assistant'
import { OnboardingGate } from './OnboardingGate'
import { SkinChooser } from './SkinChooser'
import { MascotBar } from './Mascot'
import { PixelIcon, type IconName } from './PixelIcon'
import { useAccount } from '../lib/account'
import { setAssistantOpen, useAssistantOpen } from '../lib/assistant-open'
import { MASCOT_ANIM } from '../lib/mascot-anim'
import { useTapRings } from '../lib/tap-rings'
import { useSkin, useSkinChosen, useTheme } from '../lib/theme'
import { backend, NavLink, track, useNav } from '../shell'

interface Section {
  href: string
  label: string
  short: string
  icon: IconName
  /** Цвет подсветки раздела в оформлении «Точки» — как у глав на сайте. */
  accent: Accent
}

type Accent = 'teal' | 'green' | 'blue' | 'slate' | 'rasp' | 'orange'

/**
 * Дорога во вторую оболочку.
 *
 * У инструмента их две, и человек, зашедший в одну, о второй не знает. В вебе
 * зовём на версию для компьютера — на лендинг, а не сразу на файл: там сказано,
 * чем она отличается (офлайн, без фразы, данные в файле на своём диске). В окне
 * зовём на веб-версию — она нужна, когда компьютер чужой.
 */
const OTHER_SHELL = {
  web: {
    href: 'https://alex-pronin.ru/tools/utmka#offline',
    label: 'Версия для ПК',
    title: 'Портативная версия для компьютера: офлайн и без кодовой фразы',
  },
  desktop: {
    href: 'https://utmka.alex-pronin.ru',
    label: 'Веб-версия',
    title: 'Та же UTMka в браузере — пригодится на чужом компьютере',
  },
} as const

export const SECTIONS: readonly Section[] = [
  { href: '/', label: 'Генератор', short: 'Ссылка', icon: 'link', accent: 'teal' },
  { href: '/batch', label: 'Пакетный режим', short: 'Пакет', icon: 'grid', accent: 'green' },
  { href: '/parse', label: 'Разбор', short: 'Разбор', icon: 'search', accent: 'blue' },
  { href: '/history', label: 'История', short: 'История', icon: 'clock', accent: 'slate' },
  { href: '/templates', label: 'Шаблоны', short: 'Шаблоны', icon: 'star', accent: 'rasp' },
]

interface DeviceFrameProps {
  children: ReactNode
  /**
   * Что хост доносит поверх рамки: в вебе сюда приезжает счётчик Метрики,
   * в десктопе — предложение обновиться. Флагом `__TAURI__` внутри разметки
   * это же различие было бы невидимо в дереве файлов.
   */
  extras?: ReactNode
  /**
   * Строка заголовка окна. Есть только у десктопа: там окно объявлено без
   * системных декораций, и заголовок с кнопками — часть интерфейса. В вебе
   * заголовок рисует браузер, и слот остаётся пустым.
   */
  titleBar?: ReactNode
}

export function DeviceFrame({ children, extras, titleBar }: DeviceFrameProps) {
  const { path: pathname } = useNav()
  const { theme, toggle } = useTheme()
  const { skin, toggle: toggleSkin } = useSkin()
  const skinChosen = useSkinChosen()
  const { state: account } = useAccount()
  const askOpen = useAssistantOpen()
  const [menuOpen, setMenuOpen] = useState(false)

  /* Вход есть как понятие только в вебе. В десктопе `caps.auth === false`, и
     кнопка фразы вместе со строкой состояния не показываются вовсе — там
     сохранение работает всегда и приглашать не к чему. */
  const withAuth = backend.caps.auth
  const signedIn = account === 'member'
  const other = OTHER_SHELL[backend.caps.shell]

  const isCurrent = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  /* Вход и помощь — оранжевым: это не инструмент, а служебная страница.
     Посадочные под площадки — тот же генератор, поэтому бирюза. */
  const service = pathname.startsWith('/login') || pathname.startsWith('/help')
  const accent: Accent = service
    ? 'orange'
    : (SECTIONS.find((section) => isCurrent(section.href))?.accent ?? 'teal')

  /* В «Точках» шапка — знак, иконка помощника, тема и кнопка вида; разделы
     стоят колонкой слева. Помощь живёт в строке состояния, вход — в ней же
     («Фраза при вас»); в шапке остаётся лишь приглашение для гостя. Кнопка
     вида выделена в обоих оформлениях: о втором виде человек иначе не узнает. */
  const dots = skin === 'dots'
  useTapRings(dots)

  const themeButton = (
    <button
      type="button"
      className="iconbtn"
      onClick={toggle}
      title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
      aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
    >
      <PixelIcon name={theme === 'light' ? 'moon' : 'sun'} />
    </button>
  )

  const skinButton = (
    <button
      type="button"
      className="skinbtn"
      onClick={toggleSkin}
      title={dots ? 'Гиковый вид: ретро-терминал «ПРОНИН-ОС»' : 'Простой вид: светлый, кнопок минимум'}
    >
      {dots ? 'Гиковый вид' : 'Простой вид'}
    </button>
  )

  return (
    <div
      className={`dev${menuOpen ? '' : ' dev--menuclosed'}${titleBar ? ' dev--framed' : ''}`}
      data-accent={accent}
    >
      {titleBar}
      <div className="screen">
        <div className="crt" aria-hidden="true" />

        <div className="topbar">
          {/* Знак виден только в «Точках»: в «ПРОНИН-ОС» имя стоит в строке
              состояния, а шапка целиком отдана разделам. */}
          <NavLink to="/" className="topbar__sign" aria-label="UTMka — на главную">
            UTM<span>ka</span>
          </NavLink>
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
                {dots ? section.short : section.label}
              </NavLink>
            ))}
          </nav>

          <span className="spacer" />

          {/* Служебные кнопки. В «ПРОНИН-ОС» обёртка прозрачна для раскладки,
              в «Точках» на широком экране она встаёт над колонкой помощника,
              чтобы шапка над работой осталась одной навигацией. */}
          <div className="topbar__tools">
            {dots ? null : (
              <>
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
              </>
            )}
            {/* Помощник в «Простом» виде — только по этой иконке: лицо маскота,
                а не ещё один пиксельный значок. В «ПРОНИН-ОС» кнопка скрыта
                стилями — там свой вызов в углу экрана. */}
            {backend.assistant ? (
              <button
                type="button"
                className="askbtn"
                onClick={() => setAssistantOpen((was) => !was)}
                aria-expanded={askOpen}
                aria-label="Помощник"
                title="Помощник: опишите запуск — соберу пакет ссылок"
              >
                <span
                  className="askbtn__face"
                  aria-hidden="true"
                  style={{ backgroundImage: `url(${MASCOT_ANIM.idle.file})` }}
                />
              </button>
            ) : null}
            {skinButton}
            {themeButton}
            {withAuth && !(dots && signedIn) ? (
              <NavLink to="/login" className="keybtn">
                <PixelIcon name="key" />
                <span className="keybtn__full">{signedIn ? 'Вы вошли' : 'Кодовая фраза'}</span>
                <span className="keybtn__short">{signedIn ? 'Вход' : 'Фраза'}</span>
              </NavLink>
            ) : null}
          </div>
        </div>

        {/* Колонка помощника. В «ПРОНИН-ОС» обёртка прозрачна для раскладки
            (`display: contents`): планка остаётся под шапкой, кнопка — в углу.
            В «Точках» на широком экране это своя колонка справа. */}
        <aside className="aside" aria-label="Помощник">
          <MascotBar />
          {backend.assistant ? <Assistant /> : null}
        </aside>

        {children}
        {/* Сначала — выбор вида, приглашение в тур — уже в выбранном. */}
        {skinChosen ? <OnboardingGate /> : <SkinChooser />}
        {extras}

        {/* Строка состояния: слева — что с хранилищем, справа — постоянное.
            ⚠️ Кликается здесь только то, что действительно куда-то ведёт.
            Раньше подсвечивались при наведении все пункты подряд, включая
            «Локальный режим» и «Сохранение», — человек нажимал и не получал
            ничего. Класс `sb-item--flat` снимает вид кнопки с надписей. */}
        <div className="statusbar">
          {withAuth ? (
            <NavLink to="/login" className="sb-item">
              <span className={`sb-dot${signedIn ? '' : ' sb-dot--off'}`} aria-hidden="true" />
              {signedIn ? 'Фраза при вас' : 'Гость'}
            </NavLink>
          ) : (
            <span className="sb-item sb-item--flat" title="Данные лежат на этом компьютере">
              <span className="sb-dot" aria-hidden="true" />
              Локальный режим
            </span>
          )}
          <span className="sb-item sb-item--flat sb-quota">
            Сохранение: <b>{withAuth && !signedIn ? 'нужна фраза' : 'включено'}</b>
          </span>
          {/* Только в вебе: в окне нет ни счётчика, ни аккаунта — рассказывать
              там не о чем, а страницы такой в десктопной сборке нет вовсе. */}
          {backend.caps.shell === 'web' ? (
            <NavLink to="/privacy" className="sb-item" title="Что мы собираем">
              Данные
            </NavLink>
          ) : null}
          <span className="spacer" />
          {dots ? (
            <NavLink to="/help" className="sb-item">
              Помощь
            </NavLink>
          ) : null}
          {/* Соседняя оболочка: в вебе — портативная версия, в окне — веб. */}
          <a
            className="sb-item"
            href={other.href}
            target="_blank"
            rel="noopener noreferrer"
            title={other.title}
            /* Считаем только уход из веба в приложение: обратный зов живёт в
               окне, где счётчика нет вовсе, и цель там никогда не сработает. */
            onClick={backend.caps.shell === 'web' ? () => track('desktop_click') : undefined}
          >
            <PixelIcon name={backend.caps.shell === 'web' ? 'save' : 'link'} size={12} />
            {other.label}
          </a>
          <a
            className="sb-item sb-item--heart"
            href="https://alex-pronin.ru/donate"
            target="_blank"
            rel="noopener noreferrer"
            title="Поддержать автора рублём"
          >
            <PixelIcon name="donut" size={12} />
            Поблагодарить
          </a>
          <span className="sb-item sb-item--flat">
            <span className="wordmark">
              <b>UTM</b>
              <i>ka</i>
            </span>
            {/* Из ядра, не строкой: вписанная цифра переживает релиз и врёт
                человеку, что обновление не встало. */}
            <span>{PRODUCT_VERSION}</span>
          </span>
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
