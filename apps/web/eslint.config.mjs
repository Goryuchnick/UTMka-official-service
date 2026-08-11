import next from 'eslint-config-next'

/**
 * eslint-config-next 16 экспортируется уже как flat-config (массив), поэтому
 * FlatCompat не нужен — с ним конфиг падает на циклической структуре плагинов.
 */
const config = [
  ...next,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
]

export default config
