'use client'

/**
 * Окно помощника — маскот на весь экран поверх инструмента.
 *
 * Здесь живёт единственный LLM-сценарий: бриф → пакет меток. Всё остальное,
 * что говорит помощник, — правила: они мгновенные, бесплатные и не врут
 * (ASSISTANT-SPEC §1). Поэтому окно честно показывает остаток лимита и
 * состояние «кончился» без драмы: инструмент работает дальше.
 *
 * Анимация — Motion: окно выезжает из кнопки помощника пружиной, карточки
 * ответа проявляются каскадом.
 *
 * В «Простом» виде («Точки») помощник не стоит на экране: его зовут иконкой в
 * шапке (`DeviceFrame`), и он открывается панелью справа во всю высоту — без
 * пружин и каскадов, с примерами запросов, которые подставляются в поле одним
 * нажатием.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import {
  backendMessage,
  type BriefDropped,
  type BriefLink,
  type BriefQuota as Quota,
} from '@utmka/core'

import { PixelIcon } from './PixelIcon'
import { useAccount } from '../lib/account'
import { setAssistantOpen, useAssistantOpen } from '../lib/assistant-open'
import { handOffToBatch } from '../lib/assistant-bridge'
import { MASCOT_ANIM } from '../lib/mascot-anim'
import { useSetMascotLine } from '../lib/mascot'
import { useSkin } from '../lib/theme'
import { backend, NavLink, track, useNav } from '../shell'

/** Примеры брифа: нажатие подставляет текст в поле, запрос уходит кнопкой. */
const EXAMPLES = [
  'Осенняя распродажа: ВК, телеграм-канал и рассылка',
  'Набор на курс: Директ на поиске и ВК Реклама',
  'Листовки с QR-кодом и пост в телеграме',
] as const

const PANEL: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', visualDuration: 0.3, bounce: 0.22, delayChildren: 0.06, staggerChildren: 0.05 },
  },
  gone: { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15 } },
}

const CARD: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.22 } },
  gone: { opacity: 0, transition: { duration: 0.1 } },
}

export function Assistant() {
  const nav = useNav()
  const { state } = useAccount()
  const reduced = useReducedMotion()

  const open = useAssistantOpen()
  const [brief, setBrief] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [links, setLinks] = useState<BriefLink[]>([])
  const [dropped, setDropped] = useState<BriefDropped[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  const [copied, setCopied] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const dots = useSkin().skin === 'dots'

  // Планка с маскотом — то же лицо, что и у окна: пока модель считает, он
  // думает, а на ответ рассказывает, что из предложенного пережило правила.
  useSetMascotLine(
    busy
      ? 'Думаю над брифом. Что предложит модель — всё равно прогоню через правила.'
      : dropped.length > 0
        ? `Выбросил ${dropped.length}: правила важнее модели.`
        : links.length > 0
          ? `Готово: ${links.length} ссылок. Скобки площадок оставил как есть.`
          : '',
    busy ? 'think' : dropped.length > 0 ? 'alert' : links.length > 0 ? 'done' : 'neutral',
  )

  // Остаток лимита спрашиваем при открытии: показывать его в баре постоянно
  // означало бы дёргать сервер на каждой странице ради числа.
  useEffect(() => {
    if (!open) return undefined

    let alive = true
    void backend
      .assistant!.quota()
      .then((data) => {
        if (alive) setQuota(data)
      })
      .catch(() => {
        if (alive) setQuota({ available: false, left: 0, limit: 0 })
      })
    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAssistantOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const ask = useCallback(async () => {
    setBusy(true)
    setError('')
    setLinks([])
    setDropped([])
    try {
      const data = await backend.assistant!.brief(brief)
      if (typeof data.left === 'number') {
        setQuota({ available: true, left: data.left, limit: data.limit ?? 0 })
      }
      setLinks(data.links ?? [])
      setDropped(data.dropped ?? [])
      /* Цель — ответ, а не нажатие: отказ по квоте уходит в `catch` и
         достижением не считается, иначе выборка распухнет на тех, кому
         помощник как раз не помог. */
      track('assistant_used')
    } catch (error) {
      /* Кончившаяся квота приходит тем же путём, что отказ сети, но означает
         другое: инструмент работает дальше, просто без подсказок модели. */
      setError(backendMessage(error))
    } finally {
      setBusy(false)
    }
  }, [brief])

  const copy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(''), 1600)
    } catch {
      /* буфер недоступен — ссылку можно выделить руками */
    }
  }, [])

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(links.map((link) => link.url).join('\n'))
      setCopied('all')
      setTimeout(() => setCopied(''), 1600)
    } catch {
      /* см. выше */
    }
  }, [links])

  return (
    <>
      {dots ? null : (
        <button
          type="button"
          className="ask-fab"
          onClick={() => setAssistantOpen((was) => !was)}
          aria-expanded={open}
          aria-label="Помощник"
          title="Помощник: бриф → пакет меток"
        >
          <PixelIcon name="wand" />
          <span>Помощник</span>
        </button>
      )}

      <AnimatePresence>
        {open ? (
          <motion.div
            className={dots ? 'ask ask--panel' : 'ask'}
            role="dialog"
            aria-label="Помощник"
            variants={PANEL}
            initial={reduced || dots ? false : 'hidden'}
            animate="shown"
            exit={reduced || dots ? undefined : 'gone'}
          >
            <div className="ask-head">
              {dots ? (
                <span className="ask-name">
                  <span
                    className="askbtn__face"
                    aria-hidden="true"
                    style={{ backgroundImage: `url(${MASCOT_ANIM.idle.file})` }}
                  />
                  Помощник
                </span>
              ) : (
                <>
                  <span className="qchip qchip--magenta">
                    <PixelIcon name="wand" />
                  </span>
                  <span className="qtitle qtitle--magenta">Бриф — пакет меток</span>
                </>
              )}
              <span className="spacer" />
              {quota?.available && state === 'member' ? (
                <span className="ask-quota">
                  осталось <b>{quota.left}</b> из {quota.limit}
                </span>
              ) : null}
              <button type="button" className="iconbtn" onClick={() => setAssistantOpen(false)} aria-label="Закрыть">
                <PixelIcon name="close" />
              </button>
            </div>

            {state !== 'member' ? (
              <div className="invite">
                {dots ? (
                  <span>
                    Опишите запуск словами — соберу пакет ссылок. Нужна кодовая фраза: ответы
                    модели платные.
                  </span>
                ) : (
                  <span>
                    <b>Помощнику нужна кодовая фраза.</b> Разбирать бриф умеет только языковая
                    модель, и каждый её ответ сервис UTMka оплачивает самостоятельно — поэтому
                    запросы считаются, а считать их можно только на чей-то счёт. Всё остальное в
                    инструменте работает без входа и ничего не стоит.
                  </span>
                )}
                <NavLink className="btn btn--sm" to="/login">
                  <PixelIcon name="key" />
                  Завести фразу
                </NavLink>
              </div>
            ) : (
              <>
                {dots && links.length === 0 && !busy ? (
                  <div className="ask-ex" role="group" aria-label="Примеры брифа">
                    {EXAMPLES.map((example) => (
                      <button
                        key={example}
                        type="button"
                        className="ask-q"
                        aria-pressed={brief === example}
                        onClick={() => {
                          setBrief(example)
                          areaRef.current?.focus()
                        }}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                ) : null}

                <textarea
                  ref={areaRef}
                  className="area ym-disable-keys ym-hide-content"
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder={
                    dots
                      ? 'Или опишите запуск своими словами'
                      : 'Запускаем осенний набор на Директ, ВК и рассылку по базе. Ведём на страницу с расписанием.'
                  }
                  aria-label="Бриф запуска"
                  rows={dots ? 3 : 4}
                />

                <div className="result-row">
                  <button
                    type="button"
                    className="btn btn--main"
                    disabled={busy || brief.trim().length < 10}
                    onClick={ask}
                  >
                    {busy ? 'Думаю…' : 'Собрать пакет'}
                  </button>
                  {links.length > 0 ? (
                    <>
                      <button type="button" className="btn btn--sm" onClick={copyAll}>
                        <PixelIcon name={copied === 'all' ? 'check' : 'copy'} />
                        {copied === 'all' ? 'Скопировано' : 'Скопировать все'}
                      </button>
                      {/* Пакет — естественное продолжение брифа: там строки
                          можно править и выгружать в CSV, а не только копировать. */}
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => {
                          handOffToBatch(
                            links.map((link) => ({
                              platform: link.platform,
                              source: link.params.source,
                              medium: link.params.medium,
                              campaign: link.params.campaign,
                              content: link.params.content,
                              term: link.params.term,
                            })),
                          )
                          setAssistantOpen(false)
                          nav.go('/batch')
                        }}
                      >
                        <PixelIcon name="grid" />
                        Открыть в пакете
                      </button>
                    </>
                  ) : null}
                </div>

                {error ? <p className="hint hint--error">{error}</p> : null}

                {dots ? null : (
                  <p className="hint">
                    Что предложит модель, я всё равно прогоняю через правила: чиню регистр и
                    пробелы, а то, что не чинится, не показываю вовсе. Лимит — потому что ответы
                    модели платные для автора; кончится — генератор работает как работал.
                  </p>
                )}
              </>
            )}

            {links.length > 0 ? (
              <div className="ask-list">
                {links.map((link) => (
                  <motion.div className="ask-card" key={link.url} variants={reduced || dots ? undefined : CARD}>
                    <div className="hist-name">
                      {link.platform}
                      {link.fixed > 0 ? <span className="hist-tag">починил {link.fixed}</span> : null}
                    </div>
                    <div className="hist-url">{link.url}</div>
                    {link.issues.length > 0 ? (
                      <div className="issue-text">{link.issues[0].consequence}</div>
                    ) : null}
                    <button type="button" className="btn btn--sm" onClick={() => copy(link.url)}>
                      <PixelIcon name={copied === link.url ? 'check' : 'copy'} />
                      {copied === link.url ? 'Скопировано' : 'Скопировать'}
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : null}

            {dropped.length > 0 ? (
              <div className="issue issue--error">
                <div className="issue-title">Выброшено: {dropped.length}</div>
                <div className="issue-text">
                  {dropped[0].why} Соберите это вручную — правила важнее модели.
                </div>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
