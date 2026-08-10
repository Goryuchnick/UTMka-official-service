import { describe, expect, it } from 'vitest'
import {
  detectSplits,
  findSimilar,
  isKnown,
  levenshtein,
  looksLikeSame,
  mergeInto,
  resolveCanonical,
  suggest,
  upsertEntry,
} from '../src/dictionary.js'
import type { DictEntry } from '../src/types.js'

const entry = (value: string, uses = 1, kind: DictEntry['kind'] = 'source'): DictEntry => ({
  kind,
  value,
  uses,
})

describe('looksLikeSame', () => {
  it('считает одинаковыми написания, различающиеся регистром и пробелами', () => {
    expect(looksLikeSame('VK Ads', 'vk_ads')).toBe(true)
  })

  it('знает синонимы площадок', () => {
    expect(looksLikeSame('tg', 'telegram')).toBe(true)
    expect(looksLikeSame('fb', 'facebook')).toBe(true)
  })

  it('ловит опечатку в одну букву', () => {
    expect(looksLikeSame('yandeks', 'yandex')).toBe(true)
  })

  it('считает приставку тем же смыслом', () => {
    expect(looksLikeSame('vk', 'vk_target')).toBe(true)
  })

  it('разные источники не путает', () => {
    expect(looksLikeSame('vk', 'telegram')).toBe(false)
    expect(looksLikeSame('email', 'yandex')).toBe(false)
  })

  it('на пустых значениях отвечает нет', () => {
    expect(looksLikeSame('', 'vk')).toBe(false)
  })
})

describe('levenshtein', () => {
  it('считает расстояние', () => {
    expect(levenshtein('vk', 'vk')).toBe(0)
    expect(levenshtein('yandex', 'yandeks')).toBe(2)
    expect(levenshtein('', 'abc')).toBe(3)
  })
})

describe('suggest / isKnown', () => {
  const entries = [entry('vk', 10), entry('telegram', 5), entry('vkontakte', 2), entry('yandex', 7)]

  it('подсказывает по префиксу, частые выше', () => {
    expect(suggest(entries, 'source', 'vk').map((e) => e.value)).toEqual(['vk', 'vkontakte'])
  })

  it('без префикса отдаёт всё по частоте', () => {
    expect(suggest(entries, 'source', '')[0]?.value).toBe('vk')
  })

  it('не предлагает значения, сведённые в алиас', () => {
    const merged = mergeInto(entries, 'source', 'vkontakte', 'vk')
    expect(suggest(merged, 'source', 'vk').map((e) => e.value)).toEqual(['vk'])
  })

  it('isKnown не зависит от регистра и пробелов', () => {
    expect(isKnown(entries, 'source', 'VK')).toBe(true)
    expect(isKnown(entries, 'source', 'dzen')).toBe(false)
  })
})

describe('findSimilar — предупреждение «такого вы раньше не использовали»', () => {
  const entries = [entry('vk', 10), entry('telegram', 4)]

  it('находит похожее написание', () => {
    expect(findSimilar(entries, 'source', 'vkontakte').map((e) => e.value)).toEqual(['vk'])
  })

  it('на знакомом значении молчит', () => {
    expect(findSimilar(entries, 'source', 'vk')).toEqual([])
  })

  it('на действительно новом значении молчит', () => {
    expect(findSimilar(entries, 'source', 'avito')).toEqual([])
  })
})

describe('detectSplits — детектор расщепления', () => {
  it('собирает три написания одного источника в группу', () => {
    const entries = [entry('telegram', 8), entry('tg', 3), entry('t_me', 1), entry('yandex', 5)]
    const groups = detectSplits(entries)

    expect(groups).toHaveLength(1)
    expect(groups[0]?.suggested).toBe('telegram')
    expect(groups[0]?.variants.map((v) => v.value)).toEqual(['telegram', 'tg', 't_me'])
    expect(groups[0]?.totalUses).toBe(12)
  })

  it('не смешивает значения разных полей', () => {
    const entries = [entry('email', 3, 'source'), entry('email', 3, 'medium')]
    expect(detectSplits(entries)).toEqual([])
  })

  it('на чистом справочнике ничего не находит', () => {
    expect(detectSplits([entry('vk', 5), entry('yandex', 3), entry('avito', 1)])).toEqual([])
  })

  it('сведённые алиасы больше не считает расщеплением', () => {
    const entries = [entry('telegram', 8), entry('tg', 3)]
    expect(detectSplits(mergeInto(entries, 'source', 'tg', 'telegram'))).toEqual([])
  })
})

describe('upsertEntry / mergeInto', () => {
  it('новое значение добавляет со счётчиком 1', () => {
    const next = upsertEntry([], 'source', 'vk', '2026-08-10T10:00:00Z')
    expect(next).toEqual([
      {
        kind: 'source',
        value: 'vk',
        uses: 1,
        firstSeenAt: '2026-08-10T10:00:00Z',
        lastUsedAt: '2026-08-10T10:00:00Z',
      },
    ])
  })

  it('известному поднимает счётчик, не трогая дату первого появления', () => {
    const first = upsertEntry([], 'source', 'vk', '2026-08-01T10:00:00Z')
    const second = upsertEntry(first, 'source', 'vk', '2026-08-10T10:00:00Z')
    expect(second[0]?.uses).toBe(2)
    expect(second[0]?.firstSeenAt).toBe('2026-08-01T10:00:00Z')
    expect(second[0]?.lastUsedAt).toBe('2026-08-10T10:00:00Z')
  })

  it('пустое значение игнорирует', () => {
    expect(upsertEntry([], 'source', '   ')).toEqual([])
  })

  it('resolveCanonical возвращает канон для алиаса', () => {
    const entries = mergeInto([entry('tg', 2)], 'source', 'tg', 'telegram')
    expect(resolveCanonical(entries, 'source', 'tg')).toBe('telegram')
    expect(resolveCanonical(entries, 'source', 'telegram')).toBe('telegram')
  })
})
