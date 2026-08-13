import { describe, expect, it } from 'vitest'

import {
  applyHistoryLimit,
  isTemplatesFull,
  sameTemplateName,
  STORAGE_MESSAGES,
  trackValues,
} from '../src/storage-rules'
import { HISTORY_LIMIT, TEMPLATES_LIMIT } from '../src/repository'
import type { DictEntry } from '../src/types'

describe('потолок истории', () => {
  it('оставляет ровно 500 записей и выкидывает самые старые', () => {
    const list = Array.from({ length: 501 }, (_, index) => ({
      id: String(index),
      createdAt: new Date(2026, 0, 1, 0, 0, index).toISOString(),
    }))

    const kept = applyHistoryLimit(list)

    expect(kept).toHaveLength(HISTORY_LIMIT)
    // Самая свежая — первой, самая старая (index 0) вытеснена.
    expect(kept[0]?.id).toBe('500')
    expect(kept.some((item) => item.id === '0')).toBe(false)
  })

  it('при одинаковой дате порядок определён, а не случаен', () => {
    /* Импорт файла кладёт пачку строк одной миллисекундой: без разрыва ничьей
       вытеснялась бы произвольная запись, и результат отличался бы от прогона
       к прогону. */
    const same = '2026-08-13T10:00:00.000Z'
    const list = [
      { id: 'a', createdAt: same },
      { id: 'b', createdAt: same },
      { id: 'c', createdAt: same },
    ]

    expect(applyHistoryLimit(list, 2).map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('запись без даты не выбрасывается и не ломает сортировку', () => {
    const list = [{ id: 'нет-даты' }, { id: 'есть', createdAt: '2026-08-13T10:00:00.000Z' }]
    expect(applyHistoryLimit(list, 5)).toHaveLength(2)
  })
})

describe('потолок шаблонов', () => {
  it('срабатывает на 500-м, а не на 501-м', () => {
    expect(isTemplatesFull(TEMPLATES_LIMIT - 1)).toBe(false)
    expect(isTemplatesFull(TEMPLATES_LIMIT)).toBe(true)
  })

  it('текст отказа называет число, а не «слишком много»', () => {
    expect(STORAGE_MESSAGES.templatesFull).toContain(String(TEMPLATES_LIMIT))
  })
})

describe('справочник наполняется сохранением ссылки', () => {
  const now = '2026-08-13T10:00:00.000Z'

  it('первое значение появляется с uses = 1', () => {
    const next = trackValues([], { source: 'yandex', medium: 'cpc' }, now)

    expect(next).toHaveLength(2)
    expect(next.find((entry) => entry.value === 'yandex')).toMatchObject({
      kind: 'source',
      uses: 1,
      firstSeenAt: now,
    })
  })

  it('повторное значение увеличивает счётчик, а не задваивает строку', () => {
    const before: DictEntry[] = [
      { kind: 'source', value: 'yandex', uses: 3, firstSeenAt: '2026-01-01T00:00:00.000Z' },
    ]

    const next = trackValues(before, { source: 'yandex' }, now)

    expect(next).toHaveLength(1)
    expect(next[0]?.uses).toBe(4)
    expect(next[0]?.lastUsedAt).toBe(now)
    // Первое появление не переписывается — по нему видно возраст значения.
    expect(next[0]?.firstSeenAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('пустые и пробельные значения в справочник не попадают', () => {
    expect(trackValues([], { source: '', medium: '   ' }, now)).toHaveLength(0)
  })

  it('одно значение в разных полях — это две разные записи', () => {
    /* `email` как источник и `email` как канал — разные сущности: в отчёте
       площадки они стоят в разных колонках. */
    const next = trackValues([], { source: 'email', medium: 'email' }, now)
    expect(next).toHaveLength(2)
  })

  it('исходный массив не меняется', () => {
    const before: DictEntry[] = [{ kind: 'source', value: 'vk', uses: 1 }]
    trackValues(before, { source: 'vk' }, now)
    expect(before[0]?.uses).toBe(1)
  })
})

describe('уникальность имени шаблона', () => {
  it('не зависит от регистра и краевых пробелов — как индекс в базе', () => {
    expect(sameTemplateName('Осень 2026', 'осень 2026')).toBe(true)
    expect(sameTemplateName('  Осень  ', 'Осень')).toBe(true)
    expect(sameTemplateName('Осень', 'Осень 2')).toBe(false)
  })
})
