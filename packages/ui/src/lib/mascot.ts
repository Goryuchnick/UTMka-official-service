'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

/**
 * Реплика помощника и её настроение.
 *
 * Стор живёт вне дерева экранов: планка с маскотом прибита к шапке устройства
 * (DeviceFrame), а текст ей сообщает текущий экран. Настроение нужно, чтобы
 * маскот не просто шевелил ртом, а реагировал: кивал на готовое, удивлялся
 * поломанному, думал, пока считает модель.
 *
 * Слоя два:
 * - **фон** — что говорит экран (шаг генератора, состояние списка). Держится,
 *   пока экран не сменится;
 * - **вспышка** — ответ на конкретное действие (скопировал, сохранил, свёл
 *   расщепление). Живёт несколько секунд и уступает место фону.
 *
 * Без второго слоя помощник молчал обо всём, что человек делает руками, и
 * казался скудным: одна и та же фраза висела весь экран.
 *
 * ⚠️ Снапшот — объект, поэтому кэшируется по «сырой» паре: `useSyncExternalStore`
 * сравнивает ссылки, и новый объект на каждый вызов дал бы бесконечный
 * ре-рендер (грабли, уже собранные на закладках курса).
 */

export type MascotTone = 'neutral' | 'done' | 'alert' | 'think'

export interface MascotSay {
  line: string
  tone: MascotTone
}

const DEFAULT_LINE = 'Соберём ссылку. Начнём с адреса — куда ведём людей.'

/** Сколько держится ответ на действие, прежде чем вернуться к фону. */
const FLASH_MS = 3600

let baseLine = DEFAULT_LINE
let baseTone: MascotTone = 'neutral'

let flashLine = ''
let flashTone: MascotTone = 'done'
let flashTimer: ReturnType<typeof setTimeout> | null = null

let snapshot: MascotSay = { line: baseLine, tone: baseTone }

const SERVER_SNAPSHOT: MascotSay = { line: DEFAULT_LINE, tone: 'neutral' }

const listeners = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

function emit(): void {
  const line = flashLine || baseLine
  const tone = flashLine ? flashTone : baseTone
  if (snapshot.line === line && snapshot.tone === tone) return
  snapshot = { line, tone }
  for (const listener of listeners) listener()
}

/** Прочитать текущую реплику (для планки в шапке). */
export function useMascotSay(): MascotSay {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT)
}

/**
 * Сообщить реплику с экрана.
 *
 * Пустая строка означает «мне сейчас нечего сказать» и НЕ трогает чужую
 * реплику. Иначе окно помощника, которое живёт рядом с экраном в рамке
 * устройства, затирало бы текст экрана своей пустотой каждый раз, когда
 * ничего не считает — эффекты соседей выполняются после эффектов детей.
 */
export function useSetMascotLine(next: string, nextTone: MascotTone = 'neutral'): void {
  const set = useCallback((value: string, valueTone: MascotTone) => {
    if (!value) return
    if (baseLine === value && baseTone === valueTone) return
    baseLine = value
    baseTone = valueTone
    emit()
  }, [])

  useEffect(() => {
    set(next, nextTone)
  }, [next, nextTone, set])
}

/**
 * Ответить на действие человека. Через несколько секунд вернётся фон экрана.
 *
 * Вызывается из обработчиков, а не из рендера: это реакция на нажатие, а не
 * состояние. Пустая строка ничего не делает — удобно для веток «сказать
 * нечего».
 */
export function flashMascot(line: string, tone: MascotTone = 'done'): void {
  if (!line) return

  flashLine = line
  flashTone = tone
  emit()

  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashLine = ''
    flashTimer = null
    emit()
  }, FLASH_MS)
}
