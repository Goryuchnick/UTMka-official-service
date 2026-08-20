import { describe, expect, it } from 'vitest'
import { draftFromUrl, hasUtm, lostParams, parseUrl } from '../src/parse'
import { buildUrl } from '../src/build'

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

describe('draftFromUrl', () => {
  it('раскладывает готовую ссылку обратно по полям формы', () => {
    const draft = draftFromUrl(
      'https://example.com/page?utm_source=vk&utm_medium=cpc&utm_campaign=osen',
    )
    expect(draft.baseUrl).toBe('https://example.com/page')
    expect(draft.params).toEqual({ source: 'vk', medium: 'cpc', campaign: 'osen' })
  })

  it('чужие параметры и фрагмент оставляет в адресе', () => {
    const draft = draftFromUrl('https://example.com/p?ref=partner&utm_source=vk&page=2#top')
    expect(draft.baseUrl).toBe('https://example.com/p?ref=partner&page=2#top')
    expect(draft.params.source).toBe('vk')
  })

  it('пересборка после разбора даёт ту же ссылку', () => {
    const url = 'https://example.com/p?ref=partner&utm_source=yandex&utm_medium=cpc&utm_term={keyword}'
    expect(buildUrl(draftFromUrl(url))).toBe(url)
  })

  it('подстановки площадок не кодирует ни в одном синтаксисе', () => {
    const url = 'https://example.com/?utm_source=vk&utm_campaign={{ad_plan_id}}'
    const draft = draftFromUrl(url)
    expect(draft.params.campaign).toBe('{{ad_plan_id}}')
    expect(buildUrl(draft)).toContain('utm_campaign={{ad_plan_id}}')
  })

  it('дописанную руками метку подхватывает в своё поле', () => {
    const draft = draftFromUrl('https://example.com/?utm_source=vk&utm_content=banner_1')
    expect(draft.params.content).toBe('banner_1')
  })

  it('битый адрес возвращает как есть — пусть ругается валидатор', () => {
    const draft = draftFromUrl('  не ссылка  ')
    expect(draft.baseUrl).toBe('не ссылка')
    expect(draft.params).toEqual({})
  })
})
