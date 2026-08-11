import { describe, expect, it } from 'vitest'
import { assertPublicUrl, explainFailure, followRedirects } from '../src/redirect'
import type { HopResponse } from '../src/redirect'

/** Фейковая сеть: карта «адрес → ответ». Ядро не знает про fetch. */
function fakeNet(map: Record<string, HopResponse>) {
  return async (url: string): Promise<HopResponse> => {
    const found = map[url]
    if (!found) throw new Error(`нет ответа для ${url}`)
    return found
  }
}

describe('assertPublicUrl — предохранители SSRF', () => {
  it('пропускает обычные адреса', () => {
    expect(assertPublicUrl('https://example.com/page')).toEqual({ ok: true })
  })

  it('блокирует нехттп-схемы', () => {
    expect(assertPublicUrl('file:///etc/passwd')).toEqual({ ok: false, reason: 'blocked-scheme' })
    expect(assertPublicUrl('gopher://example.com')).toEqual({ ok: false, reason: 'blocked-scheme' })
  })

  it('блокирует localhost и петлевой адрес', () => {
    expect(assertPublicUrl('http://localhost:3000')).toEqual({
      ok: false,
      reason: 'blocked-private-host',
    })
    expect(assertPublicUrl('http://127.0.0.1/')).toEqual({
      ok: false,
      reason: 'blocked-private-host',
    })
    expect(assertPublicUrl('http://[::1]/')).toEqual({ ok: false, reason: 'blocked-private-host' })
  })

  it('блокирует приватные диапазоны', () => {
    for (const host of ['10.0.0.5', '172.16.0.1', '172.31.255.254', '192.168.1.1', '100.64.0.1']) {
      expect(assertPublicUrl(`http://${host}/`), host).toEqual({
        ok: false,
        reason: 'blocked-private-host',
      })
    }
  })

  it('блокирует адрес метаданных облака', () => {
    expect(assertPublicUrl('http://169.254.169.254/latest/meta-data/')).toEqual({
      ok: false,
      reason: 'blocked-private-host',
    })
  })

  it('пропускает публичный адрес из соседнего диапазона', () => {
    expect(assertPublicUrl('http://172.32.0.1/')).toEqual({ ok: true })
    expect(assertPublicUrl('http://5.129.197.27/')).toEqual({ ok: true })
  })

  it('блокирует внутренние зоны', () => {
    expect(assertPublicUrl('http://service.internal/')).toEqual({
      ok: false,
      reason: 'blocked-private-host',
    })
  })

  it('битый адрес не пропускает', () => {
    expect(assertPublicUrl('не ссылка')).toEqual({ ok: false, reason: 'invalid-url' })
  })
})

describe('followRedirects', () => {
  it('проходит цепочку и подтверждает, что метки дожили', async () => {
    const start = 'https://a.ru/?utm_source=vk&utm_medium=social'
    const report = await followRedirects(
      start,
      fakeNet({
        [start]: { status: 301, location: 'https://b.ru/?utm_source=vk&utm_medium=social' },
        'https://b.ru/?utm_source=vk&utm_medium=social': { status: 200 },
      }),
    )

    expect(report.hops.map((h) => h.status)).toEqual([301, 200])
    expect(report.finalUrl).toBe('https://b.ru/?utm_source=vk&utm_medium=social')
    expect(report.lost).toEqual([])
    expect(report.failure).toBeUndefined()
  })

  it('показывает метки, потерянные на редиректе', async () => {
    const start = 'https://a.ru/?utm_source=vk&utm_medium=social'
    const report = await followRedirects(
      start,
      fakeNet({
        [start]: { status: 302, location: 'https://b.ru/landing' },
        'https://b.ru/landing': { status: 200 },
      }),
    )

    expect(report.lost.sort()).toEqual(['medium', 'source'])
  })

  it('понимает относительный Location', async () => {
    const start = 'https://a.ru/old?utm_source=vk'
    const report = await followRedirects(
      start,
      fakeNet({
        [start]: { status: 301, location: '/new?utm_source=vk' },
        'https://a.ru/new?utm_source=vk': { status: 200 },
      }),
    )

    expect(report.finalUrl).toBe('https://a.ru/new?utm_source=vk')
    expect(report.lost).toEqual([])
  })

  it('обрывает цепочку, уводящую во внутреннюю сеть', async () => {
    const start = 'https://a.ru/?utm_source=vk'
    const report = await followRedirects(
      start,
      fakeNet({ [start]: { status: 302, location: 'http://169.254.169.254/' } }),
    )

    expect(report.failure).toBe('blocked-private-host')
    expect(report.failureUrl).toBe('http://169.254.169.254/')
  })

  it('не пускает даже первый адрес, если он внутренний', async () => {
    const report = await followRedirects('http://192.168.0.1/', fakeNet({}))
    expect(report.failure).toBe('blocked-private-host')
    expect(report.hops).toEqual([])
  })

  it('останавливается на петле', async () => {
    const a = 'https://a.ru/'
    const report = await followRedirects(
      a,
      fakeNet({ [a]: { status: 302, location: a } }),
      { maxHops: 3 },
    )

    expect(report.failure).toBe('too-many-hops')
    expect(report.hops).toHaveLength(3)
  })

  it('переживает сетевую ошибку', async () => {
    const report = await followRedirects('https://a.ru/', fakeNet({}))
    expect(report.failure).toBe('network-error')
  })

  it('каждый обрыв объясняется человеческими словами', () => {
    for (const failure of [
      'blocked-scheme',
      'blocked-private-host',
      'too-many-hops',
      'network-error',
      'invalid-url',
    ] as const) {
      expect(explainFailure(failure).length).toBeGreaterThan(20)
    }
  })
})
