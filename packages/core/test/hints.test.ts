import { describe, expect, it } from 'vitest'
import { appendDate, formatDate, placeholderFor, VALUE_HINTS } from '../src/hints'
import { PRESETS } from '../src/presets'
import { validateValue } from '../src/validate'
import { UTM_KEYS } from '../src/types'

describe('подсказки значений', () => {
  it('есть у каждого поля', () => {
    for (const key of UTM_KEYS) {
      expect(VALUE_HINTS[key].length, key).toBeGreaterThan(0)
    }
  })

  it('сами не вызывают замечаний валидатора', () => {
    for (const key of UTM_KEYS) {
      for (const hint of VALUE_HINTS[key]) {
        const blocking = validateValue(key, hint.value).filter((i) => i.level !== 'info')
        expect(blocking, `${key}=${hint.value}`).toEqual([])
      }
    }
  })

  it('источники и каналы совпадают со значениями пресетов', () => {
    const sources = new Set(VALUE_HINTS.source.map((h) => h.value))
    const mediums = new Set(VALUE_HINTS.medium.map((h) => h.value))
    // Подстановка — не значение для списка: `{price_model}` у Авито подставит площадка.
    const isMacro = (value: string): boolean => /^\{.+\}$/.test(value)
    for (const preset of PRESETS) {
      const source = preset.params.source ?? ''
      const medium = preset.params.medium ?? ''
      if (!isMacro(source)) expect(sources.has(source), preset.id).toBe(true)
      if (!isMacro(medium)) expect(mediums.has(medium), preset.id).toBe(true)
    }
  })

  it('placeholderFor отдаёт первый пример', () => {
    expect(placeholderFor('medium')).toBe('cpc')
  })
})

describe('appendDate', () => {
  it('дописывает дату через подчёркивание, а не заменяет значение', () => {
    expect(appendDate('osenniy_nabor', '2026-09-01')).toBe('osenniy_nabor_2026-09-01')
  })

  it('в пустое поле кладёт только дату', () => {
    expect(appendDate('', '2026-09-01')).toBe('2026-09-01')
  })

  it('ту же дату второй раз не добавляет', () => {
    const once = appendDate('sale', '2026-09-01')
    expect(appendDate(once, '2026-09-01')).toBe(once)
  })
})

describe('formatDate', () => {
  it('форматирует в YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 8, 1))).toBe('2026-09-01')
  })
})
