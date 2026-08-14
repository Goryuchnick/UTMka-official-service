import { describe, expect, it } from 'vitest'
import { parseUrl } from '../src/parse'
import {
  fixablePreview,
  isFullyFixable,
  validateDraft,
  validateParsed,
  validateSemantics,
  validateValue,
  worstLevel,
} from '../src/validate'
import type { Issue, IssueCode, LinkDraft } from '../src/types'

const codes = (issues: readonly Issue[]): IssueCode[] => issues.map((i) => i.code)
const draft = (baseUrl: string, params: LinkDraft['params'] = {}): LinkDraft => ({ baseUrl, params })

describe('validateValue', () => {
  it('ловит заглавные буквы и объясняет расщепление', () => {
    const [issue] = validateValue('source', 'Facebook')
    expect(issue?.code).toBe('value-uppercase')
    expect(issue?.fixable).toBe(true)
    expect(issue?.consequence).toContain('два разных источника')
  })

  it('пробел считает ошибкой, а не предупреждением', () => {
    const issues = validateValue('campaign', 'back to school')
    const whitespace = issues.find((i) => i.code === 'value-whitespace')
    expect(whitespace?.level).toBe('error')
  })

  it('предупреждает про кириллицу', () => {
    expect(codes(validateValue('campaign', 'осень'))).toContain('value-cyrillic')
  })

  it('ловит спецсимволы', () => {
    expect(codes(validateValue('campaign', 'sale&winter'))).toContain('value-special-chars')
  })

  it('не считает спецсимволами фигурные скобки плейсхолдера', () => {
    expect(codes(validateValue('term', '{keyword}'))).not.toContain('value-special-chars')
  })

  it('предупреждает о неизвестной подстановке', () => {
    const issues = validateValue('term', '{myphrase}')
    const unknown = issues.find((i) => i.code === 'placeholder-unknown')
    expect(unknown?.consequence).toContain('буквально')
  })

  it('замечает разделитель по краям', () => {
    expect(codes(validateValue('campaign', '_autumn'))).toContain('value-trailing-separator')
  })

  it('на чистом значении молчит', () => {
    expect(validateValue('source', 'vk')).toEqual([])
  })

  it('пустое значение не проверяет', () => {
    expect(validateValue('source', '')).toEqual([])
  })
})

describe('validateSemantics — ловушки, которые не ловят обычные генераторы', () => {
  it('medium=organic на размеченной ссылке', () => {
    const issues = validateSemantics({ source: 'yandex', medium: 'organic' })
    const trap = issues.find((i) => i.code === 'semantic-paid-as-organic')
    expect(trap?.level).toBe('warning')
    expect(trap?.consequence).toContain('окупаемость')
  })

  it('площадка, положенная в medium', () => {
    const issues = validateSemantics({ source: 'site', medium: 'vk' })
    expect(codes(issues)).toContain('semantic-source-in-medium')
  })

  it('платный поиск без utm_term', () => {
    const issues = validateSemantics({ source: 'yandex', medium: 'cpc' })
    const hint = issues.find((i) => i.code === 'semantic-search-without-term')
    expect(hint?.level).toBe('info')
    expect(hint?.consequence).toContain('{keyword}')
  })

  it('на корректной паре молчит', () => {
    expect(validateSemantics({ source: 'vk', medium: 'social', campaign: 'a' })).toEqual([])
  })
})

describe('validateDraft', () => {
  it('требует адрес', () => {
    expect(codes(validateDraft(draft('')))).toContain('url-empty')
  })

  it('подсказывает про отсутствующую схему', () => {
    const issues = validateDraft(draft('example.com', { source: 'vk', medium: 'social' }))
    const scheme = issues.find((i) => i.code === 'url-no-scheme')
    expect(scheme?.level).toBe('info')
    expect(scheme?.fixable).toBe(true)
  })

  it('ругается на битый домен', () => {
    expect(codes(validateDraft(draft('не ссылка', { source: 'vk' })))).toContain('url-invalid')
  })

  it('предупреждает о слишком длинной ссылке', () => {
    const issues = validateDraft(draft('https://example.com/', { campaign: 'a'.repeat(2100) }))
    expect(codes(issues)).toContain('url-too-long')
  })

  it('напоминает про пустые source и medium, если что-то уже заполнено', () => {
    const issues = validateDraft(draft('https://example.com/', { campaign: 'autumn' }))
    const missing = issues.filter((i) => i.code === 'param-missing-required')
    expect(missing.map((i) => i.field).sort()).toEqual(['medium', 'source'])
  })

  it('про пустую кампанию говорит отдельно и мягче', () => {
    const issues = validateDraft(draft('https://example.com/', { source: 'vk', medium: 'social' }))
    const campaign = issues.find((i) => i.code === 'param-missing-required')
    expect(campaign?.field).toBe('campaign')
    expect(campaign?.level).toBe('info')
  })

  it('на пустой форме про обязательные поля молчит', () => {
    const issues = validateDraft(draft('https://example.com/'))
    expect(codes(issues)).not.toContain('param-missing-required')
  })

  it('на корректном черновике не находит ничего блокирующего', () => {
    const issues = validateDraft(
      draft('https://example.com/page', { source: 'vk', medium: 'social', campaign: 'autumn' }),
    )
    expect(issues).toEqual([])
  })
})

describe('validateParsed', () => {
  it('поднимает дубль параметра как ошибку', () => {
    const parsed = parseUrl('https://example.com/?utm_source=vk&utm_source=tg&utm_medium=social')
    const duplicate = validateParsed(parsed).find((i) => i.code === 'param-duplicate')
    expect(duplicate?.level).toBe('error')
    expect(duplicate?.consequence).toContain('непредсказуемо')
  })

  it('на неразобранной ссылке отдаёт одну ошибку', () => {
    const issues = validateParsed(parseUrl('нет-ссылки'))
    expect(codes(issues)).toEqual(['url-invalid'])
  })
})

describe('сводки', () => {
  it('worstLevel выбирает худший уровень', () => {
    expect(worstLevel(validateValue('campaign', 'back to School'))).toBe('error')
    expect(worstLevel(validateValue('campaign', 'Autumn'))).toBe('warning')
    expect(worstLevel([])).toBeNull()
  })

  it('isFullyFixable отличает чинимое от требующего рук', () => {
    expect(isFullyFixable(validateValue('campaign', 'Back To School'))).toBe(true)
    expect(isFullyFixable(validateSemantics({ source: 'yandex', medium: 'organic' }))).toBe(false)
  })

  it('fixablePreview показывает, какие поля изменит нормализация', () => {
    expect(fixablePreview({ source: 'VK', medium: 'social', campaign: 'осень' })).toEqual([
      'source',
      'campaign',
    ])
  })
})
