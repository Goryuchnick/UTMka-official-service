'use client'

/**
 * Экран кодовой фразы.
 *
 * Два действия на одном экране: ввести существующую фразу или завести новую.
 * Новая приходит с сервера один раз — она нигде не хранится в открытом виде,
 * поэтому экран после генерации превращается в «запишите, второго шанса нет».
 *
 * Способы сохранить перенесены с сайта (`profile/BackupDialog.tsx`): копия,
 * файл, системное «поделиться», письмо. Плюс оттуда же два приёма, которые
 * реально спасают фразу: гард на закрытие вкладки, пока она не сохранена, и
 * блокировка кнопки «дальше» до подтверждения.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'

import { PixelIcon } from '@/components/PixelIcon'
import { logout, setAccount, useAccount } from '@/lib/account'
import { useSetMascotLine } from '@/lib/mascot'
import { hasMixedScripts } from '@/lib/passphrase-shape'

type Stage = 'idle' | 'busy' | 'fresh'

/* Наличие системного «поделиться» — свойство браузера, которое не меняется.
   Читаем его через useSyncExternalStore с серверным снапшотом `false`: на
   сервере navigator нет, а установка стейта в эффекте дала бы лишний рендер. */
const NO_CHANGES = () => () => {}
const readCanShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const NO_SHARE_ON_SERVER = () => false

export function LoginScreen() {
  const router = useRouter()
  const { state, storage, refresh } = useAccount()

  const [phrase, setPhrase] = useState('')
  const [fresh, setFresh] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  /** Явное «записал руками» — на случай, когда буфер и файл не подходят. */
  const [confirmed, setConfirmed] = useState(false)
  const canShare = useSyncExternalStore(NO_CHANGES, readCanShare, NO_SHARE_ON_SERVER)

  const saved = confirmed || done === 'copy' || done === 'file'

  useSetMascotLine(
    state === 'member'
      ? 'Фраза при вас — шаблоны, справочник и история теперь ваши.'
      : 'Одно поле вместо почты и пароля. Восстановления нет, поэтому фразу лучше записать.',
    state === 'member' ? 'done' : 'neutral',
  )

  /* Пока фраза не сохранена — предупреждаем при закрытии вкладки. Второй раз
     её показать неоткуда: у нас только отпечаток. */
  useEffect(() => {
    if (stage !== 'fresh' || saved) return undefined
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [stage, saved])

  /** Раскладку ловим на вводе, а не после отправки: иначе объяснить нечем. */
  const mixed = useMemo(() => phrase.trim().length >= 4 && hasMixedScripts(phrase), [phrase])

  const flash = useCallback((what: string) => {
    setDone(what)
    setTimeout(() => setDone((was) => (was === what ? '' : was)), 1800)
  }, [])

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

  /* Текст для «поделиться» и файла. Ссылка на вход внутри: через полгода
     человек найдёт заметку и не вспомнит, от чего эта фраза. */
  const note = useMemo(() => {
    const where = typeof window !== 'undefined' ? window.location.origin : 'https://utmka.alex-pronin.ru'
    return [
      'UTMka — кодовая фраза для входа',
      '',
      fresh,
      '',
      `Вход: ${where}/login`,
      'Восстановить фразу нельзя: у сервиса есть только её отпечаток.',
    ].join('\n')
  }, [fresh])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fresh)
      flash('copy')
    } catch {
      setError('Буфер обмена недоступен — сохраните файлом или перепишите')
    }
  }, [fresh, flash])

  const saveFile = useCallback(() => {
    const blob = new Blob([note], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'utmka-kodovaya-fraza.txt'
    link.click()
    URL.revokeObjectURL(url)
    flash('file')
  }, [note, flash])

  const share = useCallback(async () => {
    if (!navigator.share) return
    try {
      await navigator.share({ title: 'UTMka — кодовая фраза', text: note })
      flash('share')
    } catch {
      /* пользователь отменил — не ошибка */
    }
  }, [note, flash])

  const mail = useCallback(() => {
    window.location.href = `mailto:?subject=${encodeURIComponent('UTMka — кодовая фраза')}&body=${encodeURIComponent(note)}`
    flash('mail')
  }, [note, flash])

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

          <span className="field-label">Сохранить</span>
          <div className="result-row">
            <button type="button" className="btn btn--main" onClick={copy}>
              <PixelIcon name={done === 'copy' ? 'check' : 'copy'} />
              {done === 'copy' ? 'Скопировано' : 'Скопировать'}
            </button>
            <button type="button" className="btn btn--sm" onClick={saveFile}>
              <PixelIcon name={done === 'file' ? 'check' : 'save'} />
              {done === 'file' ? 'Файл сохранён' : 'Файлом'}
            </button>
            {canShare ? (
              <button type="button" className="btn btn--sm" onClick={share}>
                <PixelIcon name="share" />
                Поделиться
              </button>
            ) : null}
            <button type="button" className="btn btn--sm" onClick={mail}>
              <PixelIcon name="mail" />
              Письмом
            </button>
          </div>

          <label className="checkline">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>Записал в надёжном месте</span>
          </label>

          {error ? <p className="hint hint--error">{error}</p> : null}

          <p className="explain">
            <b>Второй раз мы её не покажем.</b> В базе лежит только отпечаток фразы, самой фразы у
            нас нет — восстановить не сможем ни мы, ни вы. Потеряете — потеряете и сохранённое.
          </p>

          <div className="result-row">
            <button
              type="button"
              className="btn btn--main"
              disabled={!saved}
              title={saved ? undefined : 'Сначала сохраните фразу — потом продолжим'}
              onClick={() => router.push('/templates')}
            >
              <PixelIcon name="star" />
              Продолжить
            </button>
            {!saved ? <span className="hint">Кнопка откроется, когда фраза будет сохранена.</span> : null}
          </div>
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
          <div className={`input ${error ? 'input--err' : mixed ? 'input--warn' : ''}`.trim()}>
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
          {!error && mixed ? (
            <span className="hint">
              В фразе и русские, и латинские буквы — обычно это забытая раскладка клавиатуры.
            </span>
          ) : null}
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
            {stage === 'busy' ? 'Генерирую…' : 'Сгенерировать новую'}
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
