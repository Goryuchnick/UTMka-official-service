// Поддельный мост Tauri для фронта десктопа в обычном Chromium.
//
// Живое окно Tauri не везде поднять (в облачном контейнере нет ни Rust, ни
// WebView2), а раскладку окна 1180×820 проверять надо. Мост отвечает на те
// команды, которые экраны зовут при открытии; всё прочее возвращает null.
// Это проверка вёрстки, а не поведения: сохранение файлов, сеть и база здесь
// не настоящие — их смотрят в `npx tauri dev`.
const { H, T, D } = require('./demo.js')

async function installBridge(ctx, { theme = 'dark', skin = null } = {}) {
  await ctx.addInitScript(
    ([data, theme, skin]) => {
      window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} }
      window.__TAURI_INTERNALS__ = {
        metadata: { currentWindow: { label: 'main' }, currentWebview: { windowLabel: 'main', label: 'main' } },
        transformCallback: () => Math.floor(Math.random() * 1e9),
        unregisterCallback() {},
        convertFileSrc: (p) => p,
        async invoke(cmd, args) {
          if (cmd === 'templates_list') return data.T
          if (cmd === 'history_list') return data.H
          if (cmd === 'dictionary_list') return data.D
          if (cmd === 'history_add') return { ...data.H[0], ...(args?.input || {}), id: 'new' }
          if (cmd === 'sync_state') return { linked: false }
          if (cmd === 'plugin:window|is_maximized') return false
          // Нет базы 2.2 и нет обновления — окна-предложения не всплывают.
          if (cmd === 'import22_probe' || cmd === 'plugin:updater|check') throw { kind: 'rejected', message: 'нет' }
          return null
        },
      }
      localStorage.setItem('utmka.onboarding.v2', '1')
      localStorage.setItem('utmka.theme', theme)
      // ключ есть всегда — иначе снимки закрыло бы окно выбора вида
      localStorage.setItem('utmka.skin', skin || 'os')
    },
    [{ H, T, D }, theme, skin],
  )
}

module.exports = { installBridge }
