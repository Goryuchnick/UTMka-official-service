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
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import type { Issue, UtmParams } from '@utmka/core'

import { PixelIcon } from '@/components/PixelIcon'
import { useAccount } from '@/lib/account'
import { useSetMascotLine } from '@/lib/mascot'

interface BriefLink {
  platform: string
  params: UtmParams
  url: string
  fixed: number
  issues: Issue[]
}

interface BriefDropped {
  platform: string
  why: string
}

interface Quota {
  available: boolean
  left: number
  limit: number
}

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
  const { state } = useAccount()
  const reduced = useReducedMotion()

  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [links, setLinks] = useState<BriefLink[]>([])
  const [dropped, setDropped] = useState<BriefDropped[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  const [copied, setCopied] = useState('')

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
    void fetch('/api/assistant/brief', { cache: 'no-store' })
      .then((response) => response.json() as Promise<Quota>)
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
      if (event.key === 'Escape') setOpen(false)
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
      const response = await fetch('/api/assistant/brief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brief }),
      })
      const data = (await response.json()) as {
        links?: BriefLink[]
        dropped?: BriefDropped[]
        left?: number
        limit?: number
        error?: string
      }

      if (typeof data.left === 'number') {
        setQuota({ available: true, left: data.left, limit: data.limit ?? 0 })
      }
      if (!response.ok) {
        setError(data.error ?? 'Не получилось')
        return
      }
      setLinks(data.links ?? [])
      setDropped(data.dropped ?? [])
    } catch {
      setError('Сеть не отвечает')
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
      <button
        type="button"
        className="ask-fab"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-label="Помощник"
        title="Помощник: бриф → пакет меток"
      >
        <PixelIcon name="wand" />
        <span>Помощник</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="ask"
            role="dialog"
            aria-label="Помощник"
            variants={PANEL}
            initial={reduced ? false : 'hidden'}
            animate="shown"
            exit={reduced ? undefined : 'gone'}
          >
            <div className="ask-head">
              <span className="qchip qchip--magenta">
                <PixelIcon name="wand" />
              </span>
              <span className="qtitle qtitle--magenta">Бриф — пакет меток</span>
              <span className="spacer" />
              {quota?.available && state === 'member' ? (
                <span className="ask-quota">
                  осталось <b>{quota.left}</b> из {quota.limit}
                </span>
              ) : null}
              <button type="button" className="iconbtn" onClick={() => setOpen(false)} aria-label="Закрыть">
                <PixelIcon name="close" />
              </button>
            </div>

            {state !== 'member' ? (
              <div className="invite">
                <span>
                  <b>Помощнику нужна кодовая фраза.</b> Разбирать бриф умеет только языковая
                  модель, и каждый её ответ автор оплачивает сам — поэтому запросы считаются,
                  а считать их можно только на чей-то счёт. Всё остальное в инструменте
                  работает без входа и ничего не стоит.
                </span>
                <Link className="btn btn--sm" href="/login">
                  <PixelIcon name="key" />
                  Завести фразу
                </Link>
              </div>
            ) : (
              <>
                <textarea
                  className="area"
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="Запускаем осенний набор на Директ, ВК и рассылку по базе. Ведём на страницу с расписанием."
                  aria-label="Бриф запуска"
                  rows={4}
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
                    <button type="button" className="btn btn--sm" onClick={copyAll}>
                      <PixelIcon name={copied === 'all' ? 'check' : 'copy'} />
                      {copied === 'all' ? 'Скопировано' : 'Скопировать все'}
                    </button>
                  ) : null}
                </div>

                {error ? <p className="hint hint--error">{error}</p> : null}

                <p className="hint">
                  Что предложит модель, я всё равно прогоняю через правила: чиню регистр и
                  пробелы, а то, что не чинится, не показываю вовсе. Лимит — потому что ответы
                  модели платные для автора; кончится — генератор работает как работал.
                </p>
              </>
            )}

            {links.length > 0 ? (
              <div className="ask-list">
                {links.map((link) => (
                  <motion.div className="ask-card" key={link.url} variants={reduced ? undefined : CARD}>
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
