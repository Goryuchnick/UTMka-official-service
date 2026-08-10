/**
 * `@utmka/core` — слой правил UTMka.
 *
 * Чистый TypeScript: ни сети, ни DOM, ни зависимостей. Всё, что требует
 * внешнего мира (запросы, хранилище, часы), принимается параметром.
 * Один и тот же модуль обслуживает веб и будущий десктоп на Tauri.
 */

export * from './types.js'
export * from './normalize.js'
export * from './build.js'
export * from './parse.js'
export * from './validate.js'
export * from './presets.js'
export * from './dictionary.js'
export * from './batch.js'
export * from './redirect.js'
export * from './repository.js'
