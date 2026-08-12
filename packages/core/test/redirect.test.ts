import { describe, expect, it } from 'vitest'
import { assertPublicUrl, explainFailure, followRedirects, isPublicHost } from '../src/redirect'
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
    // Числовая метка больше 255 — для URL-парсера это вообще не адрес.
    expect(assertPublicUrl('http://999.1.1.1/')).toEqual({ ok: false, reason: 'invalid-url' })
  })

  /* Классические обходы наивного фильтра «четыре числа через точку».
     Все записи ниже — тот же 127.0.0.1, и `fetch` их понимает. */
  it('блокирует числовые записи петлевого адреса', () => {
    for (const host of ['2130706433', '0177.0.0.1', '0x7f.0.0.1', '127.1', '0']) {
      expect(assertPublicUrl(`http://${host}/`), host).toEqual({
        ok: false,
        reason: 'blocked-private-host',
      })
    }
  })

  it('блокирует всенулевые адреса обеих версий', () => {
    expect(assertPublicUrl('http://[::]/')).toEqual({ ok: false, reason: 'blocked-private-host' })
    expect(assertPublicUrl('http://0.0.0.0/')).toEqual({
      ok: false,
      reason: 'blocked-private-host',
    })
  })

  it('блокирует IPv4-mapped IPv6', () => {
    expect(assertPublicUrl('http://[::ffff:127.0.0.1]/')).toEqual({
      ok: false,
      reason: 'blocked-private-host',
    })
    expect(assertPublicUrl('http://[::ffff:7f00:1]/')).toEqual({
      ok: false,
      reason: 'blocked-private-host',
    })
  })

  it('числовые формы публичных адресов не ломает', () => {
    expect(assertPublicUrl('http://134744072/')).toEqual({ ok: true }) // 8.8.8.8
    expect(assertPublicUrl('http://8.8.8.8/')).toEqual({ ok: true })
  })
})

describe('isPublicHost — проверка адреса после резолва', () => {
  it('пропускает публичные адреса', () => {
    expect(isPublicHost('8.8.8.8')).toBe(true)
    expect(isPublicHost('5.129.197.27')).toBe(true)
    expect(isPublicHost('2a00:1450:4010:c07::8b')).toBe(true)
  })

  it('заворачивает адреса, в которые может указывать чужой домен', () => {
    for (const address of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '169.254.169.254', '::1']) {
      expect(isPublicHost(address), address).toBe(false)
    }
  })

  /* Сюда приходит строка от вызывающего, а не результат URL-парсера, который
     числовые формы нормализует сам. Проверяем, что фильтр справляется без него. */
  it('разбирает числовые записи петлевого адреса', () => {
    for (const address of ['2130706433', '0177.0.0.1', '0x7f.0.0.1', '127.1', '0']) {
      expect(isPublicHost(address), address).toBe(false)
    }
  })

  it('разворачивает IPv4-mapped IPv6', () => {
    expect(isPublicHost('::ffff:127.0.0.1')).toBe(false)
    expect(isPublicHost('::ffff:7f00:1')).toBe(false)
    expect(isPublicHost('::ffff:8.8.8.8')).toBe(true)
  })

  it('битую числовую запись считает опасной, домен — нет', () => {
    expect(isPublicHost('999.1.1.1')).toBe(false)
    expect(isPublicHost('example.com')).toBe(true)
    expect(isPublicHost('a1.example.com')).toBe(true)
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
