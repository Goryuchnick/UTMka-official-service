import { describe, expect, it, vi } from 'vitest'

import { checkRedirects } from '@/lib/redirect-fetch'

/**
 * Фейковая сеть: карта «адрес → ответ». Отдаём ровно то, что читает наш
 * фетчер, — код, заголовки и тело с отменяемым потоком.
 */
function fakeFetch(map: Record<string, { status: number; location?: string }>) {
  const cancel = vi.fn(async () => undefined)

  const impl = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = String(input)
    const found = map[url]
    if (!found) throw new Error(`нет ответа для ${url}`)

    return {
      status: found.status,
      headers: new Headers(found.location ? { location: found.location } : {}),
      body: { cancel },
    } as unknown as Response
  })

  return { impl: impl as unknown as typeof fetch, calls: impl, cancel }
}

/** Резолвер имён: карта «имя → адреса». Незнакомое имя не резолвится. */
function fakeLookup(map: Record<string, string[]>) {
  return async (hostname: string) => {
    const found = map[hostname]
    if (!found) throw new Error(`ENOTFOUND ${hostname}`)
    return found.map((address) => ({ address }))
  }
}

describe('checkRedirects — цепочка и метки', () => {
  it('проходит цепочку и подтверждает, что метки дожили', async () => {
    const start = 'https://a.ru/?utm_source=vk&utm_medium=social'
    const end = 'https://b.ru/?utm_source=vk&utm_medium=social'
    const net = fakeFetch({ [start]: { status: 301, location: end }, [end]: { status: 200 } })

    const report = await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: fakeLookup({ 'a.ru': ['93.184.216.34'], 'b.ru': ['93.184.216.34'] }),
    })

    expect(report.hops.map((hop) => hop.status)).toEqual([301, 200])
    expect(report.finalUrl).toBe(end)
    expect(report.lost).toEqual([])
    expect(report.failure).toBeUndefined()
  })

  it('показывает метки, которые срезал редирект', async () => {
    const start = 'https://a.ru/?utm_source=vk&utm_medium=social'
    const end = 'https://b.ru/landing'
    const net = fakeFetch({ [start]: { status: 302, location: end }, [end]: { status: 200 } })

    const report = await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: fakeLookup({ 'a.ru': ['93.184.216.34'], 'b.ru': ['93.184.216.34'] }),
    })

    expect([...report.lost].sort()).toEqual(['medium', 'source'])
  })
})

describe('checkRedirects — предохранители SSRF', () => {
  it('не идёт по адресу, чьё имя резолвится внутрь сети', async () => {
    const start = 'https://evil.example.com/'
    const net = fakeFetch({ [start]: { status: 200 } })

    const report = await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: fakeLookup({ 'evil.example.com': ['127.0.0.1'] }),
    })

    expect(report.failure).toBe('blocked-private-host')
    expect(report.failureUrl).toBe(start)
    expect(net.calls).not.toHaveBeenCalled()
  })

  it('заворачивает и тот случай, когда приватный адрес — лишь один из нескольких', async () => {
    const start = 'https://mixed.example.com/'
    const net = fakeFetch({ [start]: { status: 200 } })

    const report = await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: fakeLookup({ 'mixed.example.com': ['93.184.216.34', '169.254.169.254'] }),
    })

    expect(report.failure).toBe('blocked-private-host')
    expect(net.calls).not.toHaveBeenCalled()
  })

  it('проверяет резолв на каждом хопе, а не только на первом', async () => {
    const start = 'https://good.example.com/?utm_source=vk'
    const trap = 'https://evil.example.com/'
    const net = fakeFetch({ [start]: { status: 302, location: trap }, [trap]: { status: 200 } })

    const report = await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: fakeLookup({
        'good.example.com': ['93.184.216.34'],
        'evil.example.com': ['10.0.0.5'],
      }),
    })

    expect(report.failure).toBe('blocked-private-host')
    expect(report.failureUrl).toBe(trap)
    expect(net.calls).toHaveBeenCalledTimes(1) // до ловушки не дошли
  })

  it('обрывается на редиректе к литеральному внутреннему адресу', async () => {
    const start = 'https://a.ru/'
    const net = fakeFetch({ [start]: { status: 302, location: 'http://169.254.169.254/' } })

    const report = await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: fakeLookup({ 'a.ru': ['93.184.216.34'] }),
    })

    // Здесь срабатывает фильтр ядра по имени — до резолва дело не доходит.
    expect(report.failure).toBe('blocked-private-host')
    expect(report.failureUrl).toBe('http://169.254.169.254/')
  })

  it('пустой резолв считает отказом, а не поводом идти вслепую', async () => {
    const start = 'https://ghost.example.com/'
    const net = fakeFetch({ [start]: { status: 200 } })

    const report = await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: async () => [],
    })

    expect(report.failure).toBe('blocked-private-host')
    expect(net.calls).not.toHaveBeenCalled()
  })

  it('цепочку ведёт ядро: undici следовать редиректам не разрешаем', async () => {
    const start = 'https://a.ru/'
    const net = fakeFetch({ [start]: { status: 200 } })

    await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: fakeLookup({ 'a.ru': ['93.184.216.34'] }),
    })

    const init = net.calls.mock.calls[0]?.[1]
    expect(init?.redirect).toBe('manual')
    expect(init?.signal).toBeDefined()
  })

  it('тело ответа не качает', async () => {
    const start = 'https://a.ru/'
    const net = fakeFetch({ [start]: { status: 200 } })

    await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: fakeLookup({ 'a.ru': ['93.184.216.34'] }),
    })

    expect(net.cancel).toHaveBeenCalledTimes(1)
  })

  it('недоступное имя превращается в сетевую ошибку, а не в блокировку', async () => {
    const start = 'https://nowhere.example.com/'
    const net = fakeFetch({})

    const report = await checkRedirects(start, {
      fetchImpl: net.impl,
      lookupImpl: fakeLookup({}),
    })

    expect(report.failure).toBe('network-error')
  })
})
