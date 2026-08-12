'use client'

/**
 * Обучение — пять шагов, как в 2.2, но переписанных под веб.
 *
 * Тексты 2.2 обещали «всё хранится локально в SQLite, без облака» — здесь это
 * враньё: инструмент работает без входа, а сохранённое живёт за кодовой фразой.
 * Поэтому шаги те же по смыслу (что за инструмент, генератор, история,
 * шаблоны, чем платим), но сказаны честно про эту оболочку.
 *
 * Показывается один раз: отметка в localStorage. Позже открывается кнопкой
 * «Пройти обучение» на экране помощи.
 */

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'

import { PixelIcon, type IconName } from '@/components/PixelIcon'

const SEEN_KEY = 'utmka.onboarding.v1'

interface Step {
  icon: IconName
  title: string
  text: string
  bullets: readonly string[]
}

const STEPS: readonly Step[] = [
  {
    icon: 'link',
    title: 'Это UTMka',
    text: 'Конструктор UTM-меток, который проверяет ссылку по ходу и объясняет не «неверный формат», а что именно сломается в отчёте.',
    bullets: [
      'Работает целиком без регистрации — просто соберите ссылку и заберите.',
      'Ничего личного не спрашиваем: ни почты, ни имени, ни телефона.',
    ],
  },
  {
    icon: 'wand',
    title: 'Два способа собрать',
    text: 'Простой режим задаёт четыре вопроса на человеческом языке. Расширенный показывает все пять полей сразу — как в приложении для ПК.',
    bullets: [
      'Переключение ничего не теряет: модель данных общая.',
      'Плитки площадок подставляют источник и канал сами — и объясняют разницу.',
    ],
  },
  {
    icon: 'grid',
    title: 'Не только одна ссылка',
    text: 'Пакетный режим собирает два десятка ссылок таблицей и выгружает в CSV. Разбор читает чужую ссылку и показывает, что в ней не так.',
    bullets: [
      'К готовой ссылке — QR-код и короткая ссылка через Яндекс.',
      'Фигурные скобки площадок доезжают буквально: {keyword} не кодируется.',
    ],
  },
  {
    icon: 'key',
    title: 'Чтобы сохранять — кодовая фраза',
    text: 'История, шаблоны и справочник значений живут за фразой из пяти слов. Она заменяет и логин, и пароль.',
    bullets: [
      'Почту не просим принципиально: нет почты — нет персональных данных.',
      'Обратная сторона честная: фразу нельзя восстановить, её надо записать.',
    ],
  },
  {
    icon: 'star',
    title: 'Справочник — то, ради чего возвращаются',
    text: 'Он копит значения, которыми вы уже пользовались, и ловит расщепления: когда yandex, Yandex и яндекс разъезжаются в отчёте на три строки.',
    bullets: [
      'Инструмент бесплатный и таким останется — без тарифов и апселлов.',
      'Есть версия для компьютера: она работает офлайн и хранит всё у вас.',
    ],
  },
]

const CARD: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', visualDuration: 0.32, bounce: 0.2 } },
  gone: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } },
}

/** Показывать ли обучение новичку. Читается один раз при монтировании. */
export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* приватный режим — покажем ещё раз, не страшно */
  }
}

interface OnboardingProps {
  open: boolean
  onClose: () => void
}

export function Onboarding({ open, onClose }: OnboardingProps) {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)

  const finish = useCallback(() => {
    markOnboardingSeen()
    setStep(0)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, finish])

  if (!open) return null

  const current = STEPS[step]
  const last = step === STEPS.length - 1

  return (
    <AnimatePresence>
      <div className="onb" role="dialog" aria-modal="true" aria-label="Обучение">
        <motion.div
          className="onb-card"
          variants={CARD}
          initial={reduced ? false : 'hidden'}
          animate="shown"
          exit={reduced ? undefined : 'gone'}
        >
          <div className="qhead">
            <span className="qchip qchip--teal">
              <PixelIcon name={current.icon} />
            </span>
            <span className="qtitle qtitle--teal">{current.title}</span>
            <span className="spacer" />
            <button type="button" className="iconbtn" onClick={finish} aria-label="Закрыть обучение">
              <PixelIcon name="close" />
            </button>
          </div>

          <p className="dp-lede onb-text">{current.text}</p>

          <ul className="onb-list">
            {current.bullets.map((bullet) => (
              <li key={bullet}>
                <PixelIcon name="check" size={13} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="onb-foot">
            <div className="onb-dots" aria-hidden="true">
              {STEPS.map((item, index) => (
                <i key={item.title} className={index === step ? 'on' : undefined} />
              ))}
            </div>

            <span className="spacer" />

            {step > 0 ? (
              <button type="button" className="btn btn--sm" onClick={() => setStep((value) => value - 1)}>
                Назад
              </button>
            ) : (
              <button type="button" className="btn btn--sm" onClick={finish}>
                Пропустить
              </button>
            )}

            <button
              type="button"
              className="btn btn--main"
              onClick={() => (last ? finish() : setStep((value) => value + 1))}
            >
              {last ? 'Готово' : 'Дальше'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
