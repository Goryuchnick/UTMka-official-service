import { describe, expect, it } from 'vitest'
import { buildUrl, extractBaseUrl, hasAnyParam, urlLength } from '../src/build'
import type { LinkDraft } from '../src/types'

const draft = (baseUrl: string, params: LinkDraft['params'] = {}): LinkDraft => ({ baseUrl, params })

describe('buildUrl — паритет с UTMService.build_utm_url из 2.2', () => {
  it('добавляет https:// к адресу без схемы', () => {
    expect(buildUrl(draft('example.com', { source: 'vk' }))).toBe(
      'https://example.com/?utm_source=vk',
    )
  })

  it('сохраняет чужие параметры на своих местах', () => {
    expect(buildUrl(draft('https://example.com/?page=2&ref=friend', { source: 'vk' }))).toBe(
      'https://example.com/?page=2&ref=friend&utm_source=vk',
    )
  })

  it('перезаписывает уже присутствующий utm-параметр, не двигая его', () => {
    const url = buildUrl(draft('https://example.com/?utm_source=old&page=2', { source: 'vk' }))
    expect(url).toBe('https://example.com/?utm_source=vk&page=2')
  })

  it('схлопывает дубли одного параметра', () => {
    const url = buildUrl(draft('https://example.com/?utm_source=a&utm_source=b', { source: 'vk' }))
    expect(url).toBe('https://example.com/?utm_source=vk')
  })

  it('игнорирует пустые значения', () => {
    expect(buildUrl(draft('https://example.com/', { source: 'vk', medium: '', campaign: '   ' }))).toBe(
      'https://example.com/?utm_source=vk',
    )
  })

  it('держит порядок полей: source, medium, campaign, content, term', () => {
    const url = buildUrl(
      draft('https://example.com/', {
        term: 'shoes',
        campaign: 'autumn',
        source: 'yandex',
        content: 'ad1',
        medium: 'cpc',
      }),
    )
    expect(url).toBe(
      'https://example.com/?utm_source=yandex&utm_medium=cpc&utm_campaign=autumn&utm_content=ad1&utm_term=shoes',
    )
  })

  it('сохраняет фрагмент', () => {
    expect(buildUrl(draft('https://example.com/page#anchor', { source: 'vk' }))).toBe(
      'https://example.com/page?utm_source=vk#anchor',
    )
  })

  it('пробел кодирует плюсом — как urlencode в 2.2', () => {
    expect(buildUrl(draft('https://example.com/', { campaign: 'back to school' }))).toBe(
      'https://example.com/?utm_campaign=back+to+school',
    )
  })

  it('возвращает пустую строку на пустом адресе', () => {
    expect(buildUrl(draft('   ', { source: 'vk' }))).toBe('')
  })
})

describe('buildUrl — плейсхолдеры площадок', () => {
  it('не кодирует {keyword}: иначе Директ не подставит фразу', () => {
    const url = buildUrl(draft('https://example.com/', { term: '{keyword}', content: '{ad_id}' }))
    expect(url).toBe('https://example.com/?utm_content={ad_id}&utm_term={keyword}')
  })

  it('по требованию кодирует их как обычный текст', () => {
    const url = buildUrl(draft('https://example.com/', { term: '{keyword}' }), {
      keepPlaceholders: false,
    })
    expect(url).toBe('https://example.com/?utm_term=%7Bkeyword%7D')
  })

  it('кириллицу и спецсимволы всё равно кодирует', () => {
    const url = buildUrl(draft('https://example.com/', { campaign: 'осень&зима' }))
    expect(url).toContain('utm_campaign=%D0%BE%D1%81%D0%B5%D0%BD%D1%8C%26')
  })
})

describe('extractBaseUrl', () => {
  it('отрезает параметры и фрагмент', () => {
    expect(extractBaseUrl('https://example.com/page?utm_source=vk#top')).toBe(
      'https://example.com/page',
    )
  })

  it('добавляет схему', () => {
    expect(extractBaseUrl('example.com/page')).toBe('https://example.com/page')
  })
})

describe('вспомогательное', () => {
  it('urlLength считает длину собранной ссылки', () => {
    const d = draft('https://example.com/', { source: 'vk' })
    expect(urlLength(d)).toBe(buildUrl(d).length)
  })

  it('hasAnyParam видит заполненные поля', () => {
    expect(hasAnyParam({})).toBe(false)
    expect(hasAnyParam({ source: '  ' })).toBe(false)
    expect(hasAnyParam({ source: 'vk' })).toBe(true)
  })
})
