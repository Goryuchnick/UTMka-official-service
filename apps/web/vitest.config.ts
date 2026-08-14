import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * Тесты веба — только для серверной логики, у которой есть цена ошибки:
 * предохранители SSRF в проверке редиректов. Компоненты проверяются глазами
 * через Playwright, городить для них jsdom смысла нет.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
