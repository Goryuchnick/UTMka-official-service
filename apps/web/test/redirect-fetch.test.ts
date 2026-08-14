import { describe, expect, it, vi } from 'vitest'

import { BLOCKED_CODE, checkRedirects, makeGuardedLookup } from '@/lib/redirect-fetch'

/** Транспорт-заглушка: карта «адрес → ответ». */
function fakeTransport(map: Record<string, { status: number; location?: string }>) {
  return vi.fn(async (url: string, _timeoutMs: number) => {
    const found = map[url]
    if (!found) throw new Error(`нет ответа для ${url}`)
    return { status: found.status, location: found.location }
  })
}

/** Резолвер имён: карта «имя → адреса». Незнакомое имя не резолвится. */
function fakeResolver(map: Record<string, string[]>) {
  return async (hostname: string) => {
    const found = map[hostname]
    if (!found) throw new Error(`ENOTFOUND ${hostname}`)
    return found.map((address) => ({ address }))
  }
}

/** Прогоняет guardedLookup и возвращает то, что он отдал в колбэк. */
function runLookup(
  resolver: Parameters<typeof makeGuardedLookup>[0],
  hostname: string,
  options: unknown = {},
): Promise<{ error: NodeJS.ErrnoException | null; address: unknown }> {
  return new Promise((resolve) => {
    makeGuardedLookup(resolver)(hostname, options, (error, address) => {
      resolve({ error, address })
    })
  })
}

describe('guardedLookup — предохранитель в момент подключения', () => {
  it('пропускает публичный адрес', async () => {
    const { error, address } = await runLookup(
      fakeResolver({ 'example.com': ['93.184.216.34'] }),
      'example.com',
    )
    expect(error).toBeNull()
    expect(address).toBe('93.184.216.34')
  })

  it('не пускает соединение, если имя резолвится внутрь сети', async () => {
    const { error } = await runLookup(fakeResolver({ 'evil.example.com': ['127.0.0.1'] }), 'evil.example.com')
    expect(error?.code).toBe(BLOCKED_CODE)
  })

  it('заворачивает, если приватный адрес — лишь один из нескольких', async () => {
    const { error } = await runLookup(
      fakeResolver({ 'mixed.example.com': ['93.184.216.34', '169.254.169.254'] }),
      'mixed.example.com',
    )
    expect(error?.code).toBe(BLOCKED_CODE)
  })

  it('пустой резолв считает отказом, а не поводом идти вслепую', async () => {
    const { error } = await runLookup(async () => [], 'ghost.example.com')
    expect(error?.code).toBe(BLOCKED_CODE)
  })

  it('в режиме all отдаёт весь список с семейством адресов', async () => {
    const { error, address } = await runLookup(
      fakeResolver({ 'dual.example.com': ['93.184.216.34', '2a00:1450:4010:c07::8b'] }),
      'dual.example.com',
      { all: true },
    )
    expect(error).toBeNull()
    expect(address).toEqual([
      { address: '93.184.216.34', family: 4 },
      { address: '2a00:1450:4010:c07::8b', family: 6 },
    ])
  })

  it('ошибку резолва отдаёт как есть, не выдавая её за блокировку', async () => {
    const { error } = await runLookup(fakeResolver({}), 'nowhere.example.com')
    expect(error).toBeInstanceOf(Error)
    expect(error?.code).not.toBe(BLOCKED_CODE)
  })
})

describe('checkRedirects — цепочка и метки', () => {
  it('проходит цепочку и подтверждает, что метки дожили', async () => {
    const start = 'https://a.ru/?utm_source=vk&utm_medium=social'
    const end = 'https://b.ru/?utm_source=vk&utm_medium=social'
    const transport = fakeTransport({ [start]: { status: 301, location: end }, [end]: { status: 200 } })

    const report = await checkRedirects(start, { requestImpl: transport })

    expect(report.hops.map((hop) => hop.status)).toEqual([301, 200])
    expect(report.finalUrl).toBe(end)
    expect(report.lost).toEqual([])
    expect(report.failure).toBeUndefined()
  })

  it('показывает метки, которые срезал редирект', async () => {
    const start = 'https://a.ru/?utm_source=vk&utm_medium=social'
    const end = 'https://b.ru/landing'
    const transport = fakeTransport({ [start]: { status: 302, location: end }, [end]: { status: 200 } })

    const report = await checkRedirects(start, { requestImpl: transport })

    expect([...report.lost].sort()).toEqual(['medium', 'source'])
  })

  it('передаёт транспорту потолок времени на каждый хоп', async () => {
    const start = 'https://a.ru/'
    const transport = fakeTransport({ [start]: { status: 200 } })

    await checkRedirects(start, { requestImpl: transport })

    const budget = transport.mock.calls[0]?.[1]
    expect(budget).toBeGreaterThan(0)
    expect(budget).toBeLessThanOrEqual(5_000)
  })
})

describe('транспорт — потолок времени', () => {
  /* Регрессия: раньше потолок держал `req.setTimeout`, который не тикает
     ни на резолве имени, ни на TCP-хендшейке. Домен с молчащим DNS подвешивал
     хоп на десятки секунд. Проверяем на настоящем транспорте: `lookup`,
     который никогда не отвечает, обязан упереться в таймер. */
  it('обрывает запрос, зависший на резолве имени', async () => {
    const { defaultRequesterForTest } = await import('@/lib/redirect-fetch')
    const neverResolves = () => new Promise<{ address: string }[]>(() => {})
    const request = defaultRequesterForTest(makeGuardedLookup(neverResolves))

    const started = Date.now()
    await expect(request('http://stuck.example.com/', 300)).rejects.toThrow(/таймаут/)
    expect(Date.now() - started).toBeLessThan(3_000)
  })
})

describe('checkRedirects — предохранители SSRF', () => {
  it('отказ предохранителя объясняется как блокировка, а не как сбой сети', async () => {
    const start = 'https://evil.example.com/'
    const blocked: NodeJS.ErrnoException = new Error('ведёт внутрь сети')
    blocked.code = BLOCKED_CODE

    const report = await checkRedirects(start, {
      requestImpl: async () => {
        throw blocked
      },
    })

    expect(report.failure).toBe('blocked-private-host')
    expect(report.failureUrl).toBe(start)
  })

  it('обычная сетевая ошибка блокировкой не притворяется', async () => {
    const report = await checkRedirects('https://nowhere.example.com/', {
      requestImpl: async () => {
        throw new Error('ECONNREFUSED')
      },
    })

    expect(report.failure).toBe('network-error')
  })

  it('обрывается на редиректе к литеральному внутреннему адресу', async () => {
    const start = 'https://a.ru/'
    const transport = fakeTransport({ [start]: { status: 302, location: 'http://169.254.169.254/' } })

    const report = await checkRedirects(start, { requestImpl: transport })

    // Здесь срабатывает фильтр ядра по имени — до транспорта дело не доходит.
    expect(report.failure).toBe('blocked-private-host')
    expect(report.failureUrl).toBe('http://169.254.169.254/')
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('блокировка на втором хопе не выдаётся за успешную проверку', async () => {
    const start = 'https://good.example.com/?utm_source=vk'
    const trap = 'https://evil.example.com/'
    const blocked: NodeJS.ErrnoException = new Error('ведёт внутрь сети')
    blocked.code = BLOCKED_CODE

    const report = await checkRedirects(start, {
      requestImpl: async (url: string) => {
        if (url === start) return { status: 302, location: trap }
        throw blocked
      },
    })

    expect(report.failure).toBe('blocked-private-host')
    expect(report.failureUrl).toBe(trap)
  })
})
