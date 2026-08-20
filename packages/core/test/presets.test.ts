import { describe, expect, it } from 'vitest'
import { allPlaceholders, applyPreset, getPreset, matchPreset, PRESETS } from '../src/presets'
import { KNOWN_PLACEHOLDERS, validateDraft } from '../src/validate'
import { buildUrl } from '../src/build'

describe('набор пресетов', () => {
  it('у каждого есть id, источник, канал и объяснение', () => {
    for (const preset of PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.params.source).toBeTruthy()
      expect(preset.params.medium).toBeTruthy()
      expect(preset.explain.length).toBeGreaterThan(20)
    }
  })

  it('идентификаторы уникальны', () => {
    const ids = PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('все подстановки пресетов известны валидатору', () => {
    for (const { token } of allPlaceholders()) {
      expect(KNOWN_PLACEHOLDERS.has(token.replace(/[{}]/g, ''))).toBe(true)
    }
  })

  it('ни один пресет не порождает замечаний валидатора', () => {
    for (const preset of PRESETS) {
      const issues = validateDraft({ baseUrl: 'https://example.com/', params: preset.params })
      const blocking = issues.filter((i) => i.level !== 'info')
      expect(blocking, `пресет ${preset.id}`).toEqual([])
    }
  })

  it('различает платный и бесплатный трафик одной площадки', () => {
    expect(getPreset('vk-ads')?.params.medium).toBe('cpc')
    expect(getPreset('vk-post')?.params.medium).toBe('social')
  })

  it('предупреждает, что Telegram Ads не умеет подстановки', () => {
    expect(getPreset('telegram-ads')?.caveat).toContain('Динамических подстановок')
  })

  it('ВК Реклама размечается двойными скобками нового кабинета', () => {
    const vk = getPreset('vk-ads')!
    expect(vk.params.campaign).toBe('{{ad_plan_id}}')
    expect(vk.params.content).toBe('{{banner_id}}')
    // Одинарная скобка — синтаксис закрытого vk.com/ads: ссылка откроется,
    // а в отчёт приедет литерал вместо номера.
    for (const { token } of vk.placeholders ?? []) {
      expect(token.startsWith('{{'), token).toBe(true)
    }
  })
})

describe('applyPreset', () => {
  const draft = { baseUrl: 'https://example.com/', params: { campaign: 'osenniy_nabor' } }

  it('заполняет пустые поля и не трогает заполненные', () => {
    const next = applyPreset(draft, getPreset('yandex-direct')!)
    expect(next.params).toEqual({
      campaign: 'osenniy_nabor',
      source: 'yandex',
      medium: 'cpc',
      term: '{keyword}',
      content: '{ad_id}',
    })
  })

  it('по требованию перезаписывает заполненное', () => {
    const next = applyPreset(draft, getPreset('vk-ads')!, { overwriteFilled: true })
    expect(next.params.campaign).toBe('{{ad_plan_id}}')
  })

  it('не меняет исходный черновик', () => {
    applyPreset(draft, getPreset('vk-post')!)
    expect(draft.params).toEqual({ campaign: 'osenniy_nabor' })
  })

  it('собранная по пресету ссылка сохраняет подстановки читаемыми', () => {
    const next = applyPreset({ baseUrl: 'https://example.com/', params: {} }, getPreset('yandex-direct')!)
    expect(buildUrl(next)).toContain('utm_term={keyword}')
  })
})

describe('matchPreset', () => {
  it('узнаёт площадку по паре источник + канал', () => {
    expect(matchPreset({ source: 'vk', medium: 'social' })?.id).toBe('vk-post')
    expect(matchPreset({ source: 'VK', medium: 'cpc' })?.id).toBe('vk-ads')
  })

  it('на незнакомой паре молчит', () => {
    expect(matchPreset({ source: 'avito', medium: 'cpc' })).toBeUndefined()
  })
})
