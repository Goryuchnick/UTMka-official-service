import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Сборка фронта десктопа.
 *
 * Отдельное приложение, а не статический экспорт Next: различие оболочек
 * (нет входа, нет помощника на LLM, другой набор разделов) живёт в композиции
 * — две точки входа собирают разные наборы экранов из одного `packages/ui`, —
 * а не в рантайм-флагах `__TAURI__` внутри разметки (ARCHITECTURE §11).
 *
 * Tailwind остаётся: utility-классов в проекте ноль, но на его preflight
 * опираются 2460 строк собственного CSS. Меняется только плагин сборки.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      /* Реализация контракта оболочки. Веб направляет тот же `#shell` в свой
         файл поверх fetch — экраны разницы не видят и проверяются типами. */
      '#shell': fileURLToPath(new URL('./src/lib/shell.tsx', import.meta.url)),
    },
  },

  /* Окно Tauri ждёт dev-сервер на фиксированном порту: уехавший порт
     означает белое окно без единой ошибки. */
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Rust-дерево к фронту отношения не имеет, а watcher на нём тяжёлый.
      ignored: ['**/src-tauri/**'],
    },
  },

  // Вывод Vite не затирает сообщения cargo — иначе ошибки линкера не увидеть.
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  build: {
    /* Не по последнему WebView2 на машине разработчика: у пользователей
       рантаймы разные, а на macOS это вообще WebKit. */
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
})
