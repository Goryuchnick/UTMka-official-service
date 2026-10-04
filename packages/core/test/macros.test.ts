import { describe, expect, it } from 'vitest'
import {
  appendMacro,
  MACRO_GROUPS,
  macrosForSource,
  macroTokenNames,
  PLACEHOLDER_RE,
  PLATFORM_LITERALS,
} from '../src/macros'
import { buildUrl } from '../src/build'
import { normalizeValue } from '../src/normalize'
import { KNOWN_PLACEHOLDERS, validateValue } from '../src/validate'

describe('справочник подстановок', () => {
  it('идентификаторы групп уникальны', () => {
    const ids = MACRO_GROUPS.map((group) => group.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('каждая подстановка обёрнута в скобки и что-то объясняет', () => {
    for (const group of MACRO_GROUPS) {
      for (const macro of group.macros) {
        expect(macro.token, group.id).toMatch(/^\{{1,2}[a-z_0-9.]+\}{1,2}$/i)
        expect(macro.meaning.length, macro.token).toBeGreaterThan(3)
      }
    }
  })

  it('внутри группы токены не повторяются', () => {
    for (const group of MACRO_GROUPS) {
      const tokens = group.macros.map((macro) => macro.token)
      expect(new Set(tokens).size, group.id).toBe(tokens.length)
    }
  })

  it('площадка находится по источнику', () => {
    expect(macrosForSource('yandex')?.id).toBe('yandex-direct')
    expect(macrosForSource('VK')?.id).toBe('vk-ads')
    expect(macrosForSource('google')?.id).toBe('google-ads')
    expect(macrosForSource('facebook')?.id).toBe('meta-ads')
    expect(macrosForSource('avito-ads')?.id).toBe('avito-ads')
    expect(macrosForSource('avito')?.id).toBe('avito-ads')
    expect(macrosForSource('yandex.promopages')?.id).toBe('yandex-promopages')
    expect(macrosForSource('max')?.id).toBe('max')
    expect(macrosForSource('')).toBeUndefined()
    expect(macrosForSource('offline')).toBeUndefined()
  })

  it('Директ — ровно рабочие имена из справки', () => {
    // https://yandex.ru/support/direct/ru/statistics/url-tags, сверено 2026-10-04.
    // {adtarget_name} «больше не поддерживается», {addphrases} в справке нет.
    const tokens = macrosForSource('yandex')?.macros.map((m) => m.token).sort()
    expect(tokens).toEqual(
      [
        '{ad_id}', '{adtarget_id}', '{banner_id}', '{campaign_id}', '{campaign_name}',
        '{campaign_name_lat}', '{campaign_type}', '{coef_goal_context_id}', '{creative_id}',
        '{device_type}', '{gbid}', '{keyword}', '{match_type}', '{matched_keyword}',
        '{phrase_id}', '{position}', '{position_type}', '{region_id}', '{region_name}',
        '{retargeting_id}', '{source}', '{source_type}', '{yclid}',
      ].sort(),
    )
  })

  it('VK — 16 подстановок справки и два вторых имени', () => {
    // https://ads.vk.ru/help/features/utm, сверено 2026-10-04.
    const tokens = macrosForSource('vk')?.macros.map((m) => m.token) ?? []
    expect(tokens).toHaveLength(18)
    expect(tokens).toContain('{{ad_group_id}}')
    expect(tokens).toContain('{{lead_form_name}}')
  })

  it('у MAX своих подстановок нет, и это сказано прямо', () => {
    const group = macrosForSource('max')
    expect(group?.macros).toEqual([])
    expect(group?.caveat).toContain('Директ')
  })

  it('у Telegram Ads подстановок нет, и это сказано прямо', () => {
    const group = macrosForSource('telegram')
    expect(group?.macros).toEqual([])
    expect(group?.caveat).toContain('нет')
  })

  it('VK и Google не путают синтаксис с Директом', () => {
    expect(macrosForSource('vk')?.macros.every((m) => m.token.startsWith('{{'))).toBe(true)
    // ValueTrack пишется слитно: {campaignid}, а не {campaign_id}.
    const google = macrosForSource('google')?.macros.map((m) => m.token) ?? []
    expect(google).toContain('{campaignid}')
    expect(google).not.toContain('{campaign_id}')
  })

  it('валидатор знает каждую подстановку справочника', () => {
    for (const name of macroTokenNames()) {
      expect(KNOWN_PLACEHOLDERS.has(name), name).toBe(true)
    }
  })

  it('ни одна подстановка не порождает замечаний в поле', () => {
    for (const group of MACRO_GROUPS) {
      for (const macro of group.macros) {
        const issues = validateValue('campaign', macro.token)
        expect(issues, `${group.id} ${macro.token}`).toEqual([])
      }
    }
  })

  it('общая регулярка видит каждую подстановку целиком', () => {
    for (const group of MACRO_GROUPS) {
      for (const macro of group.macros) {
        expect([...macro.token.matchAll(PLACEHOLDER_RE)].map((m) => m[0]), macro.token).toEqual([macro.token])
      }
    }
  })

  it('«Привести в порядок» не меняет ни одной подстановки', () => {
    for (const group of MACRO_GROUPS) {
      for (const macro of group.macros) {
        expect(normalizeValue(macro.token), `${group.id} ${macro.token}`).toBe(macro.token)
      }
    }
  })

  it('метки площадок не порождают замечаний', () => {
    for (const literal of PLATFORM_LITERALS) {
      expect(validateValue('source', literal), literal).toEqual([])
    }
  })

  it('двойные скобки доезжают до ссылки нетронутыми', () => {
    const url = buildUrl({
      baseUrl: 'https://example.com/',
      params: { source: 'vk', medium: 'cpc', campaign: '{{ad_plan_id}}' },
    })
    expect(url).toContain('utm_campaign={{ad_plan_id}}')
  })
})

describe('appendMacro', () => {
  it('в пустое поле кладёт сам токен', () => {
    expect(appendMacro('', '{campaign_id}')).toBe('{campaign_id}')
  })

  it('к набранному дописывает через подчёркивание', () => {
    expect(appendMacro('osen', '{campaign_id}')).toBe('osen_{campaign_id}')
  })

  it('не удваивает разделитель', () => {
    expect(appendMacro('osen_', '{campaign_id}')).toBe('osen_{campaign_id}')
  })

  it('повторную вставку того же токена игнорирует', () => {
    expect(appendMacro('osen_{campaign_id}', '{campaign_id}')).toBe('osen_{campaign_id}')
  })

  it('пустой токен ничего не меняет', () => {
    expect(appendMacro('osen', '')).toBe('osen')
  })
})
