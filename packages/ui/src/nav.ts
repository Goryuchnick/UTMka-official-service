'use client'

/**
 * Контракт навигации.
 *
 * Живёт в `@utmka/ui`, а не в ядре: это React-форма, а ядро не знает про React
 * и не будет знать. Экраны спрашивают «где я» и «отведи меня туда», а чем это
 * сделано — `next/navigation` в вебе или react-router в окне Tauri — их не
 * касается.
 *
 * Реализацию подставляет оболочка через тот же алиас `#shell`, что и бэкенд.
 */

import type { ComponentType, ReactNode } from 'react'

export interface Nav {
  /** Текущий путь без строки запроса: `/history`. */
  path: string
  /** Перейти по адресу приложения. Внешние ссылки сюда не отдаём. */
  go(to: string): void
}

/**
 * Разобранная строка запроса — **отдельным хуком**, а не полем `Nav`.
 *
 * В Next чтение строки запроса выводит компонент из статического рендера и
 * требует границы Suspense. Пока это было полем `Nav`, рамка устройства
 * читала query на каждой странице и роняла пререндер 404: `useSearchParams()
 * should be wrapped in a suspense boundary`. Читатель здесь ровно один —
 * генератор, и граница вокруг него уже стоит.
 *
 * Тип — `URLSearchParams`, а не `ReadonlyURLSearchParams` из Next: тип
 * фреймворка в сигнатурах экранов — тот же шов, что и прямой импорт роутера.
 */
export type UseNavParams = () => URLSearchParams

/** Ссылка внутри приложения. В вебе — `next/link`, в десктопе — react-router. */
export type NavLink = ComponentType<{
  to: string
  className?: string
  title?: string
  'aria-label'?: string
  'aria-current'?: 'page' | undefined
  onClick?: () => void
  children: ReactNode
}>
