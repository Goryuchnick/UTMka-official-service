/**
 * Сетевой слой проверки редиректов — то, чего ядру знать нельзя.
 *
 * Ядро (`@utmka/core/redirect`) держит логику цепочки и предохранители по имени
 * хоста, но само в сеть не ходит: `fetch` и DNS инжектит вызывающий. Здесь —
 * ровно эта инъекция для веба; в десктопе её место займёт команда Tauri.
 *
 * ⚠️ Это SSRF-вектор: сервер ходит по адресу, который прислал пользователь.
 * Три предохранителя, все обязательные:
 *
 * 1. `assertPublicUrl` в ядре — схема и имя хоста, **на каждом хопе**;
 * 2. `isPublicHost` здесь — по каждому адресу из DNS, тоже на каждом хопе:
 *    имя `evil.example.com` спокойно указывает на 127.0.0.1, и фильтр по имени
 *    такое пропускает;
 * 3. `redirect: 'manual'` — цепочку ведёт ядро, а не undici, иначе хопы 2..N
 *    ушли бы мимо проверок.
 *
 * 🪤 Остаточный риск — DNS rebinding: между нашим резолвом и подключением
 * undici резолвит имя ещё раз, и запись может успеть смениться. Закрыть это
 * можно только своим `lookup` в диспетчере undici. Считаем риск принятым:
 * окно измеряется миллисекундами, а основной вектор («домен смотрит внутрь
 * сети») закрыт. Если появится причина закрывать и его — точка правки здесь.
 *
 * ⚠️ Здесь намеренно нет `import 'server-only'`, хотя модуль серверный: этот
 * пакет падает при импорте вне рендера, и тесты предохранителей стало бы
 * не запустить. От попадания в браузер модуль защищён импортом `dns/promises` —
 * такая сборка сломается громко и сразу.
 */

import { lookup } from 'dns/promises'

import {
  followRedirects,
  isPublicHost,
  type HopResponse,
  type RedirectReport,
} from '@utmka/core'

/** Потолок на один запрос. */
const HOP_TIMEOUT_MS = 5_000

/**
 * Потолок на всю цепочку. Без него десять медленных хопов держат роут почти
 * минуту — клиент к этому моменту давно ушёл.
 */
const TOTAL_TIMEOUT_MS = 20_000

const MAX_HOPS = 10

/** Представляемся честно: владельцу сайта видно, кто и зачем постучался. */
const USER_AGENT = 'UTMka/3.0 (+https://utmka.alex-pronin.ru)'

/** Инъекции для тестов. В проде оба поля пустые. */
export interface NetDeps {
  fetchImpl?: typeof fetch
  lookupImpl?: (hostname: string) => Promise<{ address: string }[]>
}

async function resolveAll(
  hostname: string,
  deps: NetDeps,
): Promise<{ address: string }[]> {
  if (deps.lookupImpl) return deps.lookupImpl(hostname)
  return lookup(hostname, { all: true })
}

/**
 * Проверить цепочку переадресаций для адреса, который прислал пользователь.
 *
 * Возвращает отчёт ядра — в том числе при обрыве: пользователю полезно видеть,
 * на каком шаге всё сломалось.
 */
export async function checkRedirects(
  startUrl: string,
  deps: NetDeps = {},
): Promise<RedirectReport> {
  const doFetch = deps.fetchImpl ?? fetch
  const deadline = Date.now() + TOTAL_TIMEOUT_MS

  /* Ядро превращает любую ошибку фетчера в `network-error`. Для отказа по
     приватному адресу это враньё: причина другая и объяснять её надо иначе.
     Поэтому запоминаем адрес здесь и правим отчёт после. */
  let blockedUrl: string | null = null

  const fetcher = async (url: string): Promise<HopResponse> => {
    const hostname = new URL(url).hostname.replace(/^\[|\]$/g, '')

    const addresses = await resolveAll(hostname, deps)
    if (addresses.length === 0 || addresses.some(({ address }) => !isPublicHost(address))) {
      blockedUrl = url
      throw new Error('blocked-private-host')
    }

    const budget = Math.min(HOP_TIMEOUT_MS, deadline - Date.now())
    if (budget <= 0) throw new Error('deadline')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), budget)

    try {
      const response = await doFetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'user-agent': USER_AGENT, accept: '*/*' },
      })

      /* Тело нам не нужно — нужны код и Location. Без явной отмены соединение
         продолжает качать страницу в никуда. */
      try {
        await response.body?.cancel()
      } catch {
        /* уже закрыто — не беда */
      }

      return {
        status: response.status,
        location: response.headers.get('location') ?? undefined,
      }
    } finally {
      clearTimeout(timer)
    }
  }

  const report = await followRedirects(startUrl, fetcher, { maxHops: MAX_HOPS })

  if (blockedUrl && report.failure === 'network-error') {
    return { ...report, failure: 'blocked-private-host', failureUrl: blockedUrl }
  }
  return report
}
