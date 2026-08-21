import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRODUCT_VERSION } from '../src/version'

/**
 * Сторож рассинхрона версий.
 *
 * Версий у продукта три: строка интерфейса (`version.ts`), версия приложения
 * (`tauri.conf.json`) и версия крейта (`Cargo.toml`). Первая попадает на
 * экран, вторая — в имя установщика и в `latest.json` апдейтера. Разъедутся —
 * человек увидит в углу одно, а поставит другое, и решит, что обновление не
 * встало.
 *
 * Тест читает файлы, потому что живёт в тестах: сам рантайм ядра остаётся без
 * файловой системы. Гоняется на каждой сборке релиза (`npm test --workspace
 * @utmka/core` в workflow), то есть до компиляции и до выкладки.
 */
const ROOT = join(__dirname, '..', '..', '..')

describe('версия продукта', () => {
  it('совпадает с версией приложения в tauri.conf.json', () => {
    const conf = JSON.parse(
      readFileSync(join(ROOT, 'apps', 'desktop', 'src-tauri', 'tauri.conf.json'), 'utf8'),
    ) as { version: string }
    expect(conf.version).toBe(PRODUCT_VERSION)
  })

  it('совпадает с версией крейта в Cargo.toml', () => {
    const toml = readFileSync(join(ROOT, 'apps', 'desktop', 'src-tauri', 'Cargo.toml'), 'utf8')
    // Первая `version =` после [package] — версия самого крейта, а не зависимостей.
    const at = toml.indexOf('[package]')
    const found = /^version\s*=\s*"([^"]+)"/m.exec(toml.slice(at))
    expect(found?.[1]).toBe(PRODUCT_VERSION)
  })

  it('записана тремя числами — её показывают рядом с вордмарком', () => {
    expect(PRODUCT_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
