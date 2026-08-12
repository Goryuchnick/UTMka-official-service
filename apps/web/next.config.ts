import type { NextConfig } from 'next'

/**
 * Заголовки безопасности. Caddy на боксе их не ставит для этого vhost, а Next
 * по умолчанию не ставит вовсе — значит ставим здесь, иначе приложение уедет
 * в прод голым.
 *
 * CSP жёсткая: своих внешних ресурсов у инструмента нет вообще — ни шрифтов с
 * CDN (next/font самохостит), ни аналитики, ни картинок со стороны. `connect-src
 * 'self'` достаточно: наружу ходит сервер, а не браузер.
 *
 * `'unsafe-inline'` в script-src приходится оставить: Next вставляет инлайновый
 * бутстрап-скрипт темы в <head>, и без нонса (а нонс требует динамического
 * рендера всех страниц) он не проходит. Для инструмента без пользовательского
 * контента риск невелик — XSS-инъекции неоткуда взяться.
 */
/* В разработке React пользуется `eval` для отладочных функций (восстановление
   стека, HMR) — без послабления консоль ругается, а гидратация ломается.
   В прод-сборке eval не используется, поэтому там директива строгая. */
const DEV_EVAL = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"

/* Метрика — единственный внешний хост, которому мы что-то разрешаем:
   скрипт счётчика, пиксель и отправка хитов. Вебвизор выключен, поэтому
   ни содержимое полей, ни запись сессии наружу не уходят. */
const YM = 'https://mc.yandex.ru https://mc.yandex.com'

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV_EVAL} ${YM}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${YM}`,
  "font-src 'self'",
  `connect-src 'self' ${YM}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig: NextConfig = {
  // Обязательно для деплоя в контейнер (правило воркспейса).
  output: 'standalone',
  // Ядро лежит в соседнем пакете монорепо и поставляется исходниками —
  // Next должен его транспилировать сам.
  transpilePackages: ['@utmka/core'],
  // Иначе standalone-сборка ищет node_modules только внутри apps/web.
  outputFileTracingRoot: `${__dirname}/../..`,
  // Версия сервера в заголовке помогает только тому, кто подбирает эксплойт.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ]
  },
}

export default nextConfig
