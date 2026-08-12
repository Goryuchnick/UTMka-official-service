# UTMka 3.0 — образ веб-приложения.
#
# Контекст сборки — КОРЕНЬ монорепо, а не apps/web: приложение импортирует
# @utmka/core исходниками (transpilePackages), и без пакета сборка не пройдёт.
# По той же причине standalone-выход лежит в .next/standalone/apps/web.

FROM node:20-alpine AS base

FROM base AS deps
# dl-cdn.alpinelinux.org режется DPI на RU-VPS — берём пакеты с зеркала Яндекса.
RUN sed -i 's#dl-cdn.alpinelinux.org/alpine#mirror.yandex.ru/mirrors/alpine#g' /etc/apk/repositories \
  && apk add --no-cache libc6-compat
WORKDIR /app
# Манифесты всех воркспейсов — иначе npm ci не увидит связку core ↔ web.
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/web/package.json ./apps/web/
RUN npm ci

FROM base AS builder
WORKDIR /app
# npm workspaces поднимает все зависимости в корневой node_modules, своей папки
# у apps/web нет — копируем только корневую. Симлинк @utmka/core внутри неё
# указывает на packages/core и оживает после COPY исходников ниже.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_YM_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_YM_ID=$NEXT_PUBLIC_YM_ID
ENV NEXT_TELEMETRY_DISABLED=1

# Ядро идёт с тестами — гоняем их на сборке: образ без зелёных правил не нужен.
RUN npm test --workspace @utmka/core
RUN npm run build --workspace @utmka/web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Раскладка standalone в монорепо: Next кладёт его в apps/web/.next/standalone,
# а внутри повторяет дерево от outputFileTracingRoot — server.js оказывается
# в apps/web/, node_modules и packages/ рядом на верхнем уровне.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# Спрайты маскота — единственное, что лежит в public (иконка отдаётся роутером).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
