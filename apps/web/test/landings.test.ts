import { describe, expect, it } from 'vitest'

import { UTM_KEY_BY_PARAM, validateDraft, type UtmParams } from '@utmka/core'

import { LANDINGS } from '@/lib/landings'

/**
 * Пример ссылки на посадочной — то, что человек скопирует первым. На `/vk`
 * долго стоял пример с одинарными скобками Директа: страница учила ошибке,
 * которую соседний экран генератора тут же ругал. Проверяем пример теми же
 * правилами ядра, что и форму.
 */
describe('примеры ссылок на посадочных', () => {
  for (const landing of LANDINGS) {
    if (!landing.example) continue

    it(`/${landing.slug}: пример проходит проверку подстановок своей площадки`, () => {
      const params: UtmParams = {}
      for (const [name, value] of landing.example!.params) {
        const key = UTM_KEY_BY_PARAM[name]
        if (key) params[key] = value
      }

      const issues = validateDraft({ baseUrl: `https://${landing.example!.base}`, params })
      const placeholderIssues = issues.filter(
        (issue) => issue.code === 'placeholder-unknown' || issue.code === 'placeholder-wrong-syntax',
      )
      expect(placeholderIssues).toEqual([])
    })
  }
})
