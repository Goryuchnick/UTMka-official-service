import { describe, expect, it } from 'vitest'
import { hasUtm, lostParams, parseUrl } from '../src/parse.js'

describe('parseUrl', () => {
  it('раскладывает метки по полям', () => {
    const parsed = parseUrl(
      'https://example.com/page?utm_source=vk&utm_medium=social&utm_campaign=autumn',
    )
    expect(parsed.valid).toBe(true)
    expect(parsed.baseUrl).toBe('https://example.com/page')
    expect(parsed.params).toEqual({ source: 'vk', medium: 'social', campaign: 'autumn' })
  })

  it('отделяет чужие параметры', () => {
    const parsed = parseUrl('https://example.com/?utm_source=vk&yclid=123&page=2')
    expect(parsed.extras).toEqual([
      { name: 'yclid', value: '123' },
      { name: 'page', value: '2' },
    ])
  })

  it('ловит дубли и берёт первое значение', () => {
    const parsed = parseUrl('https://example.com/?utm_source=vk&utm_source=telegram')
    expect(parsed.duplicates).toEqual(['utm_source'])
    expect(parsed.params.source).toBe('vk')
  })

  it('декодирует значения и понимает плюс как пробел', () => {
    const parsed = parseUrl('https://example.com/?utm_campaign=back+to+school&utm_term=%D0%B2%D0%BA')
    expect(parsed.params.campaign).toBe('back to school')
    expect(parsed.params.term).toBe('вк')
  })

  it('не падает на битой процентной кодировке', () => {
    const parsed = parseUrl('https://example.com/?utm_source=%zz')
    expect(parsed.valid).toBe(true)
    expect(parsed.params.source).toBe('%zz')
  })

  it('сохраняет фрагмент', () => {
    expect(parseUrl('https://example.com/page?utm_source=vk#top').hash).toBe('#top')
  })

  it('домен без точки считает невалидным', () => {
    expect(parseUrl('localhost/page').valid).toBe(false)
  })

  it('пустую строку считает невалидной', () => {
    expect(parseUrl('  ').valid).toBe(false)
  })

  it('работает с адресом без схемы', () => {
    expect(parseUrl('example.com?utm_source=vk').params.source).toBe('vk')
  })
})

describe('hasUtm / lostParams', () => {
  it('видит наличие разметки', () => {
    expect(hasUtm('https://example.com/?utm_source=vk')).toBe(true)
    expect(hasUtm('https://example.com/?page=2')).toBe(false)
  })

  it('находит потерянные и подменённые метки', () => {
    const before = 'https://example.com/?utm_source=vk&utm_medium=social&utm_campaign=a'
    const after = 'https://example.com/?utm_source=telegram&utm_campaign=a'
    expect(lostParams(before, after).sort()).toEqual(['medium', 'source'])
  })
})
