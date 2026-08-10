import { describe, expect, it } from 'vitest'
import {
  hasCyrillic,
  needsNormalization,
  normalizeBaseUrl,
  normalizeDraft,
  normalizeValue,
  transliterate,
} from '../src/normalize.js'

describe('normalizeValue', () => {
  it('приводит к нижнему регистру', () => {
    expect(normalizeValue('Facebook')).toBe('facebook')
  })

  it('заменяет пробелы на подчёркивание', () => {
    expect(normalizeValue('back to school')).toBe('back_to_school')
  })

  it('транслитерирует кириллицу', () => {
    expect(normalizeValue('осенний набор')).toBe('osenniy_nabor')
    expect(normalizeValue('ЖЁЛТЫЙ')).toBe('zheltyy')
  })

  it('выбрасывает спецсимволы, рвущие разбор параметров', () => {
    expect(normalizeValue('sale&winter?2026')).toBe('salewinter2026')
  })

  it('схлопывает и обрезает разделители', () => {
    expect(normalizeValue('__vk--ads__')).toBe('vk_ads')
  })

  it('дефисы и точки считает разделителями', () => {
    expect(normalizeValue('spring-sale.2026')).toBe('spring_sale_2026')
  })

  it('не трогает плейсхолдеры площадок', () => {
    expect(normalizeValue('{keyword}')).toBe('{keyword}')
    expect(normalizeValue('ad {Ad_ID} тест')).toBe('ad_{Ad_ID}_test')
  })

  it('идемпотентна', () => {
    const once = normalizeValue('Осенний Набор 2026!')
    expect(normalizeValue(once)).toBe(once)
  })
})

describe('transliterate', () => {
  it('сохраняет регистр первой буквы', () => {
    expect(transliterate('Жираф')).toBe('Zhiraf')
  })

  it('выбрасывает твёрдый и мягкий знаки', () => {
    expect(transliterate('подъезд')).toBe('podezd')
    expect(transliterate('соль')).toBe('sol')
  })
})

describe('normalizeBaseUrl', () => {
  it('добавляет схему', () => {
    expect(normalizeBaseUrl('example.com')).toBe('https://example.com')
  })

  it('оставляет http как есть', () => {
    expect(normalizeBaseUrl('http://example.com')).toBe('http://example.com')
  })

  it('пустую строку оставляет пустой', () => {
    expect(normalizeBaseUrl('   ')).toBe('')
  })

  it('не трогает путь и регистр домена', () => {
    expect(normalizeBaseUrl('https://Example.com/Путь')).toBe('https://Example.com/Путь')
  })
})

describe('normalizeDraft', () => {
  it('возвращает изменения списком «до / после»', () => {
    const result = normalizeDraft({
      baseUrl: 'example.com',
      params: { source: 'VK', campaign: 'осенний набор', medium: 'social' },
    })

    expect(result.draft.params).toEqual({
      source: 'vk',
      campaign: 'osenniy_nabor',
      medium: 'social',
    })
    expect(result.changes).toEqual([
      { field: 'baseUrl', before: 'example.com', after: 'https://example.com' },
      { field: 'source', before: 'VK', after: 'vk' },
      { field: 'campaign', before: 'осенний набор', after: 'osenniy_nabor' },
    ])
  })

  it('выбрасывает значения, схлопнувшиеся в пустоту', () => {
    const result = normalizeDraft({ baseUrl: 'https://example.com', params: { content: '???' } })
    expect(result.draft.params.content).toBeUndefined()
  })
})

describe('needsNormalization / hasCyrillic', () => {
  it('видит, что значение чинится', () => {
    expect(needsNormalization('vk')).toBe(false)
    expect(needsNormalization('VK ads')).toBe(true)
  })

  it('находит кириллицу', () => {
    expect(hasCyrillic('привет')).toBe(true)
    expect(hasCyrillic('hello')).toBe(false)
  })
})
