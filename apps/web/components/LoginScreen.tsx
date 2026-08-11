'use client'

/**
 * Экран кодовой фразы.
 *
 * Два действия на одном экране: ввести существующую фразу или завести новую.
 * Новая приходит с сервера один раз — она нигде не хранится в открытом виде,
 * поэтому экран после генерации превращается в «запишите, второго шанса нет».
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import { PixelIcon } from '@/components/PixelIcon'
import { logout, setAccount, useAccount } from '@/lib/account'
import { useSetMascotLine } from '@/lib/mascot'

type Stage = 'idle' | 'busy' | 'fresh'

export function LoginScreen() {
  const router = useRouter()
  const { state, storage, refresh } = useAccount()

  const [phrase, setPhrase] = useState('')
  const [fresh, setFresh] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useSetMascotLine(
    state === 'member'
      ? 'Фраза при вас — шаблоны, справочник и история теперь ваши.'
      : 'Одно поле вместо почты и пароля. Восстановления нет, поэтому фразу лучше записать.',
  )

  const login = useCallback(async () => {
    setError('')
    setStage('busy')
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'login', passphrase: phrase }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? 'Не вышло войти')
        setStage('idle')
        return
      }
      setAccount('member')
      router.push('/templates')
    } catch {
      setError('Сеть не отвечает')
      setStage('idle')
    }
  }, [phrase, router])

  const register = useCallback(async () => {
    setError('')
    setStage('busy')
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'register' }),
      })
      const data = (await response.json()) as { passphrase?: string; error?: string }
      if (!response.ok || !data.passphrase) {
        setError(data.error ?? 'Не вышло завести фразу')
        setStage('idle')
        return
      }
      setFresh(data.passphrase)
      setAccount('member')
      setStage('fresh')
    } catch {
      setError('Сеть не отвечает')
      setStage('idle')
    }
  }, [])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fresh)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Буфер обмена недоступен — перепишите руками')
    }
  }, [fresh])

  const exit = useCallback(async () => {
    await logout()
    refresh()
    setPhrase('')
  }, [refresh])

  if (!storage) {
    return (
      <div className="screen-scroll">
        <div className="glass">
          <div className="qhead">
            <span className="qchip qchip--magenta">!</span>
            <span className="qtitle qtitle--magenta">Хранилище не подключено</span>
          </div>
          <p className="hint">
            Инструмент работает целиком: генератор, пакет, разбор, QR и сокращатель. Не работает
            только сохранение — шаблоны, история и справочник.
          </p>
        </div>
      </div>
    )
  }

  if (stage === 'fresh') {
    return (
      <div className="screen-scroll">
        <div className="glass">
          <div className="qhead">
            <span className="qchip qchip--done">
              <PixelIcon name="check" />
            </span>
            <span className="qtitle qtitle--teal">Фраза заведена</span>
          </div>

          <div className="phrase">{fresh}</div>

          <div className="result-row">
            <button type="button" className="btn btn--main" onClick={copy}>
              <PixelIcon name="copy" />
              {copied ? 'Скопировано' : 'Скопировать'}
            </button>
            <button type="button" className="btn btn--sm" onClick={() => router.push('/templates')}>
              <PixelIcon name="star" />К шаблонам
            </button>
          </div>

          <p className="explain">
            <b>Запишите её сейчас.</b> Мы храним только отпечаток фразы, самой фразы у нас нет —
            восстановить её не сможем ни мы, ни вы. Потеряете — потеряете и сохранённое.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'member') {
    return (
      <div className="screen-scroll">
        <div className="glass">
          <div className="qhead">
            <span className="qchip qchip--done">
              <PixelIcon name="key" />
            </span>
            <span className="qtitle qtitle--teal">Вы вошли</span>
          </div>
          <p className="hint">
            Шаблоны, история и справочник сохраняются. На другом устройстве введите ту же фразу —
            всё окажется на месте.
          </p>
          <div className="result-row">
            <button type="button" className="btn btn--sm" onClick={() => router.push('/templates')}>
              <PixelIcon name="star" />
              Шаблоны
            </button>
            <button type="button" className="btn btn--sm" onClick={() => router.push('/history')}>
              <PixelIcon name="clock" />
              История
            </button>
            <button type="button" className="btn btn--sm" onClick={exit}>
              Выйти
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-scroll">
      <div className="glass">
        <div className="qhead">
          <span className="qchip">
            <PixelIcon name="key" />
          </span>
          <span className="qtitle qtitle--amber">Кодовая фраза</span>
        </div>

        <div className="field">
          <span className="field-label">Ваша фраза</span>
          <div className={`input ${error ? 'input--err' : ''}`.trim()}>
            <input
              type="text"
              value={phrase}
              onChange={(event) => {
                setPhrase(event.target.value)
                setError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && phrase.trim()) void login()
              }}
              placeholder="яркий-волк-река-сокол-заря-42"
              autoComplete="off"
              spellCheck={false}
              aria-label="Кодовая фраза"
            />
          </div>
          {error ? <span className="hint hint--error">{error}</span> : null}
        </div>

        <div className="result-row">
          <button
            type="button"
            className="btn btn--main"
            disabled={stage === 'busy' || phrase.trim() === ''}
            onClick={login}
          >
            Войти
          </button>
          <button type="button" className="btn btn--sm" disabled={stage === 'busy'} onClick={register}>
            <PixelIcon name="wand" />
            Завести новую
          </button>
        </div>

        <p className="explain">
          <b>Почему не почта.</b> Почта — персональные данные: их пришлось бы хранить, защищать
          и объяснять, зачем они нам. Фраза решает ту же задачу и не говорит о вас ничего.
          Обратная сторона честная: забыли фразу — сохранённое не вернуть.
        </p>
      </div>
    </div>
  )
}
