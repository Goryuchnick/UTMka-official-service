/**
 * Сетевой слой проверки редиректов — то, чего ядру знать нельзя.
 *
 * Ядро (`@utmka/core/redirect`) держит логику цепочки и предохранители по имени
 * хоста, но само в сеть не ходит: транспорт и DNS инжектит вызывающий. Здесь —
 * ровно эта инъекция для веба; в десктопе её место займёт команда Tauri.
 *
 * ⚠️ Это SSRF-вектор: сервер ходит по адресу, который прислал пользователь.
 * Три предохранителя, все обязательные:
 *
 * 1. `assertPublicUrl` в ядре — схема и имя хоста, **на каждом хопе**;
 * 2. `guardedLookup` здесь — проверка КАЖДОГО адреса из DNS в момент, когда
 *    сокет уже открывает соединение (см. ниже, почему именно так);
 * 3. никакого автоследования редиректам — цепочку ведёт ядро, иначе хопы 2..N
 *    ушли бы мимо проверок.
 *
 * 🪤 Почему запрос идёт через `http.request`, а не через `fetch`.
 * Раньше здесь был `fetch`, а адрес проверялся отдельным резолвом перед ним.
 * Это дырявая схема: undici резолвит имя ЕЩЁ РАЗ при подключении, и между
 * двумя резолвами запись успевает смениться — классический DNS rebinding.
 * Атакующий отдаёт на первый запрос публичный адрес, на второй — 127.0.0.1,
 * и получает слепой сканер внутренней сети по кодам ответа.
 * `http.request` принимает свой `lookup`, который вызывается один раз — прямо
 * при установке соединения. Проверка и подключение перестают быть двумя
 * разными событиями, окна между ними больше нет.
 *
 * ⚠️ Здесь намеренно нет `import 'server-only'`, хотя модуль серверный: этот
 * пакет падает при импорте вне рендера, и тесты предохранителей стало бы
 * не запустить. От попадания в браузер модуль защищён импортом `node:dns` —
 * такая сборка сломается громко и сразу.
 */

import { lookup as dnsLookup, type LookupAddress } from 'node:dns'
import { request as httpRequest, type IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'

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

/** Отличаем отказ предохранителя от обычной сетевой ошибки. */
export const BLOCKED_CODE = 'UTMKA_BLOCKED_HOST'

/** Резолвер имён в форме, которую ждёт `dns.lookup` с `all: true`. */
export type Resolver = (hostname: string) => Promise<{ address: string }[]>

/** Один запрос: код ответа и Location. Тело не читаем принципиально. */
export type Requester = (url: string, timeoutMs: number) => Promise<HopResponse>

export interface NetDeps {
  requestImpl?: Requester
  lookupImpl?: Resolver
}

function defaultResolver(hostname: string): Promise<{ address: string }[]> {
  return new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true }, (error, addresses) => {
      if (error) reject(error)
      else resolve(addresses)
    })
  })
}

/**
 * `lookup` для сокета: резолвит имя и пускает соединение, только если **все**
 * полученные адреса публичные.
 *
 * Проверять все, а не первый: в ответе может лежать пара «публичный + внутренний»,
 * и выбор адреса — не наше решение, а сетевого стека.
 */
export function makeGuardedLookup(resolver: Resolver = defaultResolver) {
  return function guardedLookup(
    hostname: string,
    options: unknown,
    callback: (
      error: NodeJS.ErrnoException | null,
      address: string | LookupAddress[],
      family?: number,
    ) => void,
  ): void {
    resolver(hostname).then(
      (addresses) => {
        if (addresses.length === 0) {
          callback(blockedError(`имя ${hostname} никуда не резолвится`), '', 4)
          return
        }

        const forbidden = addresses.find(({ address }) => !isPublicHost(address))
        if (forbidden) {
          callback(blockedError(`${hostname} ведёт внутрь сети`), '', 4)
          return
        }

        const all = (options as { all?: boolean } | null)?.all === true
        const list = addresses.map((entry) => ({
          address: entry.address,
          family: entry.address.includes(':') ? 6 : 4,
        }))

        if (all) callback(null, list)
        else callback(null, list[0].address, list[0].family)
      },
      (error: Error) => callback(error as NodeJS.ErrnoException, '', 4),
    )
  }
}

function blockedError(message: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(message)
  error.code = BLOCKED_CODE
  return error
}

/**
 * Запрос одного хопа: заголовки берём, тело обрываем не читая.
 *
 * 🪤 Потолок времени держит ВНЕШНИЙ таймер, а не `req.setTimeout`. У него
 * коварная особенность: он считает простой уже установленного соединения и
 * не тикает ни на резолве имени, ни на TCP-хендшейке. А это ровно те фазы,
 * которыми управляет чужой сервер: домен с молчащим DNS или недостижимым
 * адресом подвешивал бы хоп на десятки секунд — при том, что весь бюджет
 * цепочки 20 секунд. Проверено замером: `req.setTimeout(1500)` не срабатывал
 * ни при неотвечающем `lookup`, ни при коннекте в чёрную дыру.
 */
function defaultRequester(lookup: ReturnType<typeof makeGuardedLookup>): Requester {
  return (url: string, timeoutMs: number) =>
    new Promise<HopResponse>((resolve, reject) => {
      const target = new URL(url)
      const send = target.protocol === 'https:' ? httpsRequest : httpRequest

      let settled = false
      const finish = (fn: () => void) => {
        if (settled) return
        settled = true
        clearTimeout(deadline)
        fn()
      }

      const req = send(
        url,
        {
          method: 'GET',
          lookup,
          headers: { 'user-agent': USER_AGENT, accept: '*/*' },
        },
        (res: IncomingMessage) => {
          /* Заголовки получены — дальше качать нечего. `destroy` рвёт поток,
             так что тело чужой страницы к нам вообще не приезжает. */
          const status = res.statusCode ?? 0
          const location = Array.isArray(res.headers.location)
            ? res.headers.location[0]
            : res.headers.location
          res.destroy()
          req.destroy()
          finish(() => resolve({ status, location: location ?? undefined }))
        },
      )

      const deadline = setTimeout(() => {
        req.destroy()
        finish(() => reject(new Error('таймаут запроса')))
      }, timeoutMs)

      req.on('error', (error) => finish(() => reject(error)))
      req.end()
    })
}

/** Транспорт наружу — только для теста потолка времени на настоящем сокете. */
export const defaultRequesterForTest = defaultRequester

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
  const doRequest = deps.requestImpl ?? defaultRequester(makeGuardedLookup(deps.lookupImpl))
  const deadline = Date.now() + TOTAL_TIMEOUT_MS

  /* Ядро превращает любую ошибку транспорта в `network-error`. Для отказа
     предохранителя это враньё: причина другая и объяснять её надо иначе.
     Поэтому запоминаем адрес здесь и правим отчёт после. */
  let blockedUrl: string | null = null

  const fetcher = async (url: string): Promise<HopResponse> => {
    const budget = Math.min(HOP_TIMEOUT_MS, deadline - Date.now())
    if (budget <= 0) throw new Error('исчерпан общий потолок времени')

    try {
      return await doRequest(url, budget)
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === BLOCKED_CODE) blockedUrl = url
      throw error
    }
  }

  const report = await followRedirects(startUrl, fetcher, { maxHops: MAX_HOPS })

  if (blockedUrl && report.failure === 'network-error') {
    return { ...report, failure: 'blocked-private-host', failureUrl: blockedUrl }
  }
  return report
}
