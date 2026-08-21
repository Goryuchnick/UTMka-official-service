/**
 * `@utmka/core` — слой правил UTMka.
 *
 * Чистый TypeScript: ни сети, ни DOM, ни зависимостей. Всё, что требует
 * внешнего мира (запросы, хранилище, часы), принимается параметром.
 * Один и тот же модуль обслуживает веб и будущий десктоп на Tauri.
 */

export * from './version'
export * from './types'
export * from './normalize'
export * from './build'
export * from './parse'
export * from './validate'
export * from './presets'
export * from './macros'
export * from './dictionary'
export * from './batch'
export * from './redirect'
export * from './csv'
export * from './repository'
export * from './storage-rules'
export * from './exchange'
export * from './backend'
export * from './passphrase-shape'
export * from './hints'
export * from './tags'
export * from './sync'
