/**
 * Реализация контракта оболочки для десктопа: команды Tauri поверх SQLite,
 * навигация поверх react-router.
 *
 * Веб направляет тот же алиас `#shell` в `apps/web/lib/shell.tsx` поверх fetch.
 * Экраны берутся из общего `@utmka/ui` и подмены не замечают.
 */

import { useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { Nav, NavLink as NavLinkType, UseNavParams } from '@utmka/ui'
import {
  BACKEND_MESSAGES,
  BackendError,
  followRedirects,
  type HopResponse,
  type SaveFile,
  type UtmkaBackend,
} from '@utmka/core'

/** Потолок хопов — тот же, что держит серверный слой веба. */
const MAX_HOPS = 10

/**
 * Один вызов команды.
 *
 * Rust отдаёт отказ структурой `{ kind, message }` — доменный тип не
 * пересобирается из текста сообщения. Так `catch (e) { if (e.kind === 'limit') }`
 * работает одинаково в обеих оболочках.
 */
async function cmd<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(name, args)
  } catch (raw) {
    const error = raw as { kind?: BackendError['kind']; message?: string }
    if (typeof error === 'object' && error !== null && 'kind' in error) {
      throw new BackendError(error.kind ?? 'rejected', error.message ?? BACKEND_MESSAGES.rejected)
    }
    // Сюда попадает только сбой самого моста: команда не найдена, окно закрыто.
    throw new BackendError('rejected', String(raw))
  }
}

export const backend: UtmkaBackend = {
  /* Вход и помощник на LLM в этой оболочке не существуют как понятия —
     не «выключены»: интерфейс не должен предлагать завести кодовую фразу. */
  caps: { shell: 'desktop', auth: false, assistant: false, storage: true, fileSave: 'native' },

  templates: {
    list: () => cmd('templates_list'),
    create: (input) => cmd('templates_create', { input }),
    update: (id, patch) => cmd('templates_update', { id, patch }),
    remove: (id) => cmd('templates_remove', { id }),
    // Одна транзакция на весь файл, а не 500 круглых поездок через IPC.
    importMany: (rows) => cmd('templates_import', { rows }),
  },

  history: {
    list: (limit) => cmd('history_list', { limit }),
    // Внутри — вставка, вытеснение сверх 500 и наполнение справочника.
    add: (input) => cmd('history_add', { input }),
    remove: (id) => cmd('history_remove', { id }),
    clear: () => cmd('history_clear'),
    importMany: (rows) => cmd('history_import', { rows }),
  },

  dictionary: {
    list: () => cmd('dictionary_list'),
    /* Главный путь наполнения — сохранение ссылки: `history_add` вызывает
       `track_values` внутри своей транзакции. Эта ручка нужна, чтобы завести
       канон заранее, и ведёт в ту же функцию. */
    track: (params) => cmd('dictionary_track', { params }),
    merge: (kind, alias, canonical) => cmd('dictionary_merge', { kind, alias, canonical }),
    remove: (kind, value) => cmd('dictionary_remove', { kind, value }),
  },

  net: {
    shorten: (url) => cmd('net_shorten', { url }),

    /**
     * Цепочку ведёт **ядро**, а Rust делает один хоп.
     *
     * Так же устроен веб: там `followRedirects` вызывает серверный транспорт.
     * Переписывать обход цепочки на Rust значило бы завести второй экземпляр
     * логики — сравнение меток, потолок хопов, тексты обрывов — и он разошёлся
     * бы с вебом на первой же правке.
     */
    checkRedirects: (url) =>
      followRedirects(url, (hopUrl) => cmd<HopResponse>('net_hop', { url: hopUrl }), {
        maxHops: MAX_HOPS,
      }),
  },

  account: null,
  assistant: null,

  /* Обмен с веб-аккаунтом. Фраза уходит в `sync_link` один раз и на диск не
     ложится — Rust сохраняет только выданную сессию. */
  sync: {
    state: () => cmd('sync_state'),
    link: (passphrase) => cmd('sync_link', { passphrase }),
    unlink: () => cmd('sync_unlink'),
    pull: () => cmd('sync_pull'),
    push: (templates, links) => cmd('sync_push', { templates, links }),
  },
}

/**
 * Навигация окна. Роутер — hash: перезагрузка окна не сбрасывает экран, а
 * вопрос «`/batch` или `/batch.html` под протоколом `tauri://`» не возникает
 * вовсе — путь живёт после решётки и до файловой системы не доходит.
 */
export function useNav(): Nav {
  const location = useLocation()
  const navigate = useNavigate()

  return useMemo(
    () => ({ path: location.pathname, go: (to: string) => navigate(to) }),
    [location.pathname, navigate],
  )
}

/**
 * Строка запроса. Отдельным хуком — чтобы в вебе не тащить `useSearchParams`
 * в рамку устройства, где он ломает пререндер.
 */
export const useNavParams: UseNavParams = () => {
  const [search] = useSearchParams()
  return useMemo(() => new URLSearchParams(search.toString()), [search])
}

export const NavLink: NavLinkType = ({ to, children, ...rest }) => (
  <Link to={to} {...rest}>
    {children}
  </Link>
)

/**
 * Сохранение файла — системный диалог, а не `<a download>`.
 *
 * ⚠️ Это функция из списка паритета с 2.2: файл был единственным способом
 * унести данные между компьютерами. В окне Tauri ссылка со скачиванием ведёт
 * себя не так, как в браузере, и потеря заметна не сразу — нажатие просто
 * ничего не делает. Поэтому проверять её надо на живом окне, а не в dev-браузере.
 */
export const saveFile: SaveFile = async (name, _mime, body) => {
  /* MIME здесь не нужен: тип файла в системном диалоге задаётся расширением,
     а не заголовком — в отличие от браузера, где им помечается Blob. */
  const extension = name.split('.').pop() ?? 'txt'
  const path = await save({
    defaultPath: name,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  })

  // Диалог закрыли — это не ошибка, а отказ от сохранения.
  if (!path) return

  if (typeof body === 'string') {
    await writeTextFile(path, body)
  } else {
    await writeFile(path, body)
  }
}
