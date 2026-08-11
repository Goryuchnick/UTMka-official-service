import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Обязательно для деплоя в контейнер (правило воркспейса).
  output: 'standalone',
  // Ядро лежит в соседнем пакете монорепо и поставляется исходниками —
  // Next должен его транспилировать сам.
  transpilePackages: ['@utmka/core'],
  // Иначе standalone-сборка ищет node_modules только внутри apps/web.
  outputFileTracingRoot: `${__dirname}/../..`,
}

export default nextConfig
