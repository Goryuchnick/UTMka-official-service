import { describe, expect, it } from 'vitest'

import { describeSync, planHistory, planTemplates } from '../src/sync'
import type { HistoryItem, Template } from '../src/repository'

const template = (name: string, params: Record<string, string> = {}, extra: Partial<Template> = {}): Template => ({
  id: `id-${name}`,
  name,
  baseUrl: '',
  params,
  ...extra,
})

const link = (url: string, createdAt: string): HistoryItem => ({
  id: `id-${url}-${createdAt}`,
  url,
  baseUrl: url,
  params: {},
  origin: 'single',
  createdAt,
})

describe('слияние шаблонов', () => {
  it('отправляет то, чего нет в аккаунте, и забирает то, чего нет локально', () => {
    const plan = planTemplates(
      [template('Осень'), template('Только дома')],
      [template('Осень'), template('Только в вебе')],
    )

    expect(plan.upload.map((t) => t.name)).toEqual(['Только дома'])
    expect(plan.download.map((t) => t.name)).toEqual(['Только в вебе'])
    expect(plan.conflicts).toEqual([])
  })

  it('считает шаблоны с разным регистром имени одним', () => {
    const plan = planTemplates([template('дзен')], [template('Дзен')])

    expect(plan.upload).toEqual([])
    expect(plan.download).toEqual([])
    expect(plan.conflicts).toEqual([])
  })

  it('не трогает пару, где имя совпало, а метки разные', () => {
    const plan = planTemplates(
      [template('Осень', { source: 'yandex' })],
      [template('Осень', { source: 'email' })],
    )

    expect(plan.upload).toEqual([])
    expect(plan.download).toEqual([])
    expect(plan.conflicts).toEqual(['Осень'])
  })

  it('видит расхождение по адресу и по тегу, а не только по меткам', () => {
    const byUrl = planTemplates(
      [template('А', {}, { baseUrl: 'https://test.ru/1' })],
      [template('А', {}, { baseUrl: 'https://test.ru/2' })],
    )
    const byTag = planTemplates(
      [template('Б', {}, { tagName: 'Клиент' })],
      [template('Б', {}, { tagName: 'Личное' })],
    )

    expect(byUrl.conflicts).toEqual(['А'])
    expect(byTag.conflicts).toEqual(['Б'])
  })

  it('пустую метку и отсутствующую считает одним и тем же', () => {
    const plan = planTemplates(
      [template('В', { source: 'vk', medium: '' })],
      [template('В', { source: 'vk' })],
    )

    expect(plan.conflicts).toEqual([])
    expect(plan.upload).toEqual([])
  })
})

describe('слияние истории', () => {
  it('различает записи по ссылке и времени', () => {
    const plan = planHistory(
      [link('https://test.ru/a', '2026-08-01T10:00:00Z'), link('https://test.ru/b', '2026-08-02T10:00:00Z')],
      [link('https://test.ru/a', '2026-08-01T10:00:00Z'), link('https://test.ru/c', '2026-08-03T10:00:00Z')],
    )

    expect(plan.upload.map((l) => l.url)).toEqual(['https://test.ru/b'])
    expect(plan.download.map((l) => l.url)).toEqual(['https://test.ru/c'])
  })

  it('одну ссылку, собранную дважды в разное время, считает двумя записями', () => {
    const plan = planHistory(
      [link('https://test.ru/a', '2026-08-01T10:00:00Z'), link('https://test.ru/a', '2026-08-05T12:00:00Z')],
      [link('https://test.ru/a', '2026-08-01T10:00:00Z')],
    )

    expect(plan.upload).toHaveLength(1)
    expect(plan.upload[0]?.createdAt).toBe('2026-08-05T12:00:00Z')
  })

  it('не задваивает записи, у которых расходятся только миллисекунды', () => {
    const plan = planHistory(
      [link('https://test.ru/a', '2026-08-01T10:00:00.123Z')],
      [link('https://test.ru/a', '2026-08-01T10:00:00.987Z')],
    )

    expect(plan.upload).toEqual([])
    expect(plan.download).toEqual([])
  })
})

describe('отчёт', () => {
  it('говорит, что именно произошло', () => {
    expect(
      describeSync({ templatesUp: 2, templatesDown: 1, linksUp: 5, linksDown: 0, conflicts: [] }),
    ).toBe('Синхронизация: отправлено 7, получено 1.')
  })

  it('не молчит, когда всё совпало', () => {
    expect(
      describeSync({ templatesUp: 0, templatesDown: 0, linksUp: 0, linksDown: 0, conflicts: [] }),
    ).toBe('Синхронизация: всё уже совпадало.')
  })

  it('перечисляет нетронутые шаблоны поимённо', () => {
    const text = describeSync({
      templatesUp: 1,
      templatesDown: 0,
      linksUp: 0,
      linksDown: 0,
      conflicts: ['Осень', 'Дзен'],
    })

    expect(text).toContain('Осень, Дзен')
    expect(text).toContain('внутри разное')
  })
})
