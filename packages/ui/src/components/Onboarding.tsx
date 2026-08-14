'use client'

/**
 * Обучение — тур с подсветкой реальных элементов, как в 2.2.
 *
 * Механика оттуда же (`legacy/desktop-2.2/frontend/js/app.js`): затемняющая
 * маска с вырезом по `clip-path` вокруг цели, рамка подсветки и карточка
 * рядом. Разница в наполнении: у 2.2 было пять шагов про генератор, историю
 * и шаблоны, здесь добавились пакетный режим, разбор, помощник и кодовая
 * фраза — то, чего в десктопе не было вовсе.
 *
 * Если элемента шага на экране нет (узкий экран прячет панель разделов,
 * помощник ещё не смонтирован), шаг показывается карточкой по центру без
 * выреза — так же, как делал оригинал.
 */

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'

import { PixelIcon, type IconName } from './PixelIcon'

const SEEN_KEY = 'utmka.onboarding.v2'

interface Step {
  icon: IconName
  title: string
  text: string
  bullets: readonly string[]
  /** Кандидаты на подсветку: берём первый, который реально есть на экране. */
  targets?: readonly string[]
  /** С какой стороны от цели встать карточке. */
  place?: 'below' | 'above'
}

const STEPS: readonly Step[] = [
  {
    icon: 'link',
    title: 'Это UTMka',
    text: 'Конструктор UTM-меток, который проверяет ссылку по ходу и объясняет не «неверный формат», а что именно сломается в отчёте.',
    bullets: [
      'Работает целиком без регистрации — соберите ссылку и заберите.',
      'Ничего личного не спрашиваем: ни почты, ни имени, ни телефона.',
    ],
  },
  {
    icon: 'grid',
    title: 'Пять разделов',
    text: 'Генератор собирает одну ссылку. Пакет — сразу набор для всех площадок. Разбор читает чужую ссылку. История и шаблоны хранят сделанное.',
    bullets: [
      'На телефоне разделы прячутся в кнопку внизу экрана.',
      'Первые три работают без входа, последние два — за кодовой фразой.',
    ],
    targets: ['.nav', '.mdock-fab'],
    place: 'below',
  },
  {
    icon: 'wand',
    title: 'Два способа собрать',
    text: '«Просто» задаёт четыре вопроса на человеческом языке и подставляет метки площадок кнопками. «Эксперт» показывает все пять полей сразу — как в приложении для ПК.',
    bullets: [
      'Переключение ничего не теряет: данные под обоими режимами одни.',
      'Плитки площадок сами ставят источник и канал и объясняют разницу.',
    ],
    targets: ['.chips', '.result-row'],
    place: 'below',
  },
  {
    icon: 'help',
    title: 'Я подсказываю по ходу',
    text: 'В этой планке я комментирую то, что вижу в форме: где регистр разъедется, где платный трафик записан как бесплатный, что вообще сломается в отчёте.',
    bullets: [
      'Это обычные правила — они мгновенные, бесплатные и не выдумывают.',
      'Те же проверки работают в пакетном режиме и в разборе чужой ссылки.',
    ],
    targets: ['.mascotbar'],
    place: 'below',
  },
  {
    icon: 'star',
    title: 'Помощник разберёт бриф',
    text: 'Опишите запуск словами — «осенний набор на Директ, ВК и рассылку» — и получите готовый набор ссылок. Работает и для пакетного режима: пакет заполнится сам.',
    bullets: [
      'Что предложит модель, всё равно проходит через правила.',
      'Единственное платное место: ответы модели сервис оплачивает сам, отсюда лимит.',
    ],
    targets: ['.ask-fab'],
    place: 'above',
  },
  {
    icon: 'key',
    title: 'Чтобы сохранять — фраза',
    text: 'История, шаблоны и справочник значений живут за фразой из пяти слов. Она заменяет и логин, и пароль, а почту мы не просим принципиально.',
    bullets: [
      'Справочник ловит расщепления: yandex и Yandex — две строки в отчёте.',
      'Фразу нельзя восстановить, поэтому её сразу предлагается сохранить.',
    ],
    targets: ['.keybtn'],
    place: 'below',
  },
]

const PAD = 8

const CARD: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', visualDuration: 0.28, bounce: 0.18 } },
  gone: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
}

interface Spot {
  top: number
  left: number
  width: number
  height: number
}

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
    /* Событие для оболочки: в десктопе копия настроек уезжает в базу и
       переживает переустановку. Без него отметка «обучение пройдено» жила бы
       только в профиле вебвью — и предложение всплывало бы снова. */
    window.dispatchEvent(new Event('utmka:onboarding'))
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
  const [spot, setSpot] = useState<Spot | null>(null)

  const current = STEPS[step]

  /* Позиция цели пересчитывается на смене шага и при изменении окна: рамка
     устройства резиновая, а на мобилке разделы вообще уезжают в другой угол. */
  useEffect(() => {
    if (!open) return undefined

    const measure = () => {
      const selector = current.targets?.find((one) => document.querySelector(one))
      const element = selector ? document.querySelector(selector) : null
      if (!element) {
        setSpot(null)
        return
      }
      const rect = element.getBoundingClientRect()
      setSpot({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, current])

  const finish = useCallback(() => {
    markOnboardingSeen()
    setStep(0)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
      if (event.key === 'ArrowRight' && step < STEPS.length - 1) setStep((value) => value + 1)
      if (event.key === 'ArrowLeft' && step > 0) setStep((value) => value - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, finish, step])

  if (!open) return null

  const last = step === STEPS.length - 1

  /* Вырез в затемнении: тот же приём, что в 2.2 — многоугольник, обходящий
     прямоугольник цели. Без выреза подсветка выглядела бы просто рамкой. */
  const clip = spot
    ? `polygon(0% 0%, 0% 100%, ${spot.left - PAD}px 100%, ${spot.left - PAD}px ${spot.top - PAD}px, ${spot.left + spot.width + PAD}px ${spot.top - PAD}px, ${spot.left + spot.width + PAD}px ${spot.top + spot.height + PAD}px, ${spot.left - PAD}px ${spot.top + spot.height + PAD}px, ${spot.left - PAD}px 100%, 100% 100%, 100% 0%)`
    : undefined

  const cardStyle: React.CSSProperties = spot
    ? current.place === 'above'
      ? {
          bottom: Math.max(16, window.innerHeight - spot.top + 16),
          left: Math.max(16, Math.min(spot.left, window.innerWidth - 460)),
        }
      : {
          top: spot.top + spot.height + 16,
          left: Math.max(16, Math.min(spot.left, window.innerWidth - 460)),
        }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <AnimatePresence>
      <div className="onb" role="dialog" aria-modal="true" aria-label="Обучение">
        <div className="onb-mask" style={clip ? { clipPath: clip } : undefined} onClick={finish} />

        {spot ? (
          <div
            className="onb-ring"
            aria-hidden="true"
            style={{
              top: spot.top - PAD,
              left: spot.left - PAD,
              width: spot.width + PAD * 2,
              height: spot.height + PAD * 2,
            }}
          />
        ) : null}

        <motion.div
          key={step}
          className="onb-card"
          style={cardStyle}
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

          <p className="onb-text">{current.text}</p>

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
