import { describe, expect, it } from 'vitest'

import { popularTags, recentTags, type TagHint } from '../src/tags'

const template = (tagName?: string, tagColor?: string) => ({ tagName, tagColor })

describe('популярные теги', () => {
  it('ставит вперёд тот, которым помечено больше шаблонов', () => {
    const hints = popularTags([
      template('Альпина'),
      template('Welcome'),
      template('Альпина'),
      template('Альпина'),
      template('Welcome'),
      template('Личное'),
    ])

    expect(hints.map((hint) => hint.name)).toEqual(['Альпина', 'Welcome', 'Личное'])
  })

  it('считает теги, различающиеся регистром, одним', () => {
    const hints = popularTags([template('дзен'), template('Дзен'), template('ДЗЕН')])

    expect(hints).toHaveLength(1)
    // Написание — от первого встреченного: иначе подсказка скачет от правки к правке.
    expect(hints[0]?.name).toBe('дзен')
  })

  it('подбирает цвет, даже если он проставлен не у первого шаблона', () => {
    const hints = popularTags([template('Осень'), template('Осень', '#c00')])

    expect(hints[0]?.color).toBe('#c00')
  })

  it('пропускает шаблоны без тега и пустые строки', () => {
    expect(popularTags([template(), template('   '), template('')])).toEqual([])
  })

  it('отдаёт не больше запрошенного', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((name) => template(name))

    expect(popularTags(many)).toHaveLength(3)
    expect(popularTags(many, 2)).toHaveLength(2)
  })
})

describe('недавние теги', () => {
  it('идёт по порядку истории и не повторяется', () => {
    const hints = recentTags([
      template('Welcome'),
      template('Welcome'),
      template('Альпина'),
      template('Личное'),
      template('Курс'),
    ])

    expect(hints.map((hint) => hint.name)).toEqual(['Welcome', 'Альпина', 'Личное'])
  })

  it('не повторяет то, что уже показано в популярных', () => {
    const popular: TagHint[] = [{ name: 'Альпина' }]
    const hints = recentTags([template('альпина'), template('Курс')], 3, popular)

    expect(hints.map((hint) => hint.name)).toEqual(['Курс'])
  })

  it('без тегов в истории отдаёт пустой список', () => {
    expect(recentTags([template(), template(undefined, '#c00')])).toEqual([])
  })
})
