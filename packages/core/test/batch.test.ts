import { describe, expect, it } from 'vitest'
import { batchFromCsv, batchToCsv, buildBatch, summarizeBatch } from '../src/batch'
import { escapeCsvValue, parseCsv, toCsv } from '../src/csv'

describe('CSV — паритет с utils.js из 2.2', () => {
  it('экранирует запятые, кавычки и переводы строк', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"')
    expect(escapeCsvValue('он сказал "да"')).toBe('"он сказал ""да"""')
    expect(escapeCsvValue(null)).toBe('')
  })

  it('читает строку с кавычками', () => {
    const rows = parseCsv('name,value\n"Лето, 2026",vk')
    expect(rows).toEqual([{ name: 'Лето, 2026', value: 'vk' }])
  })

  it('пишет и читает обратно', () => {
    const rows = [{ Метка: 'ВК', Ссылка: 'https://example.com/?a=1,2' }]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })

  it('на пустом входе отдаёт пустое', () => {
    expect(parseCsv('только заголовки')).toEqual([])
    expect(toCsv([])).toBe('')
  })
})

describe('batchFromCsv', () => {
  it('понимает русские заголовки из Excel', () => {
    const rows = batchFromCsv('Метка,Источник,Канал,Кампания\nВК пост,vk,social,autumn')
    expect(rows).toEqual([
      { label: 'ВК пост', params: { source: 'vk', medium: 'social', campaign: 'autumn' } },
    ])
  })

  it('понимает технические заголовки', () => {
    const rows = batchFromCsv('url,utm_source,utm_medium\nhttps://a.ru/,vk,cpc')
    expect(rows[0]?.baseUrl).toBe('https://a.ru/')
    expect(rows[0]?.params).toEqual({ source: 'vk', medium: 'cpc' })
  })

  it('пустые ячейки не превращает в пустые значения', () => {
    const rows = batchFromCsv('Источник,Канал,Кампания\nvk,social,')
    expect(rows[0]?.params.campaign).toBeUndefined()
  })
})

describe('buildBatch', () => {
  const rows = [
    { label: 'ВК', params: { source: 'vk', medium: 'social' } },
    { label: 'Директ', params: { source: 'yandex', medium: 'cpc', term: '{keyword}' } },
    { label: 'Кривая', params: { source: 'VK Ads', medium: 'organic' } },
  ]

  it('подставляет общий адрес и общие значения', () => {
    const results = buildBatch(rows, {
      baseUrl: 'https://example.com/',
      params: { campaign: 'autumn' },
    })
    expect(results[0]?.url).toBe(
      'https://example.com/?utm_source=vk&utm_medium=social&utm_campaign=autumn',
    )
  })

  it('свой адрес строки перебивает общий', () => {
    const results = buildBatch([{ baseUrl: 'https://other.ru/', params: { source: 'vk' } }], {
      baseUrl: 'https://example.com/',
    })
    expect(results[0]?.url.startsWith('https://other.ru/')).toBe(true)
  })

  it('проверяет каждую строку отдельно', () => {
    const results = buildBatch(rows, { baseUrl: 'https://example.com/', params: { campaign: 'a' } })
    expect(results[0]?.issues).toEqual([])
    expect(results[2]?.issues.map((i) => i.code)).toContain('value-uppercase')
    expect(results[2]?.issues.map((i) => i.code)).toContain('semantic-paid-as-organic')
  })

  it('сводка считает строки с ошибками и предупреждениями', () => {
    const results = buildBatch(rows, { baseUrl: 'https://example.com/', params: { campaign: 'a' } })
    expect(summarizeBatch(results)).toEqual({ total: 3, withErrors: 1, withWarnings: 0 })
  })

  it('выгрузка содержит метку, ссылку и замечания', () => {
    const results = buildBatch(rows.slice(0, 1), { baseUrl: 'https://example.com/' })
    const csv = batchToCsv(results)
    expect(csv.split('\n')[0]).toBe('Метка,Ссылка,Замечания')
    expect(csv).toContain('ВК')
  })
})
