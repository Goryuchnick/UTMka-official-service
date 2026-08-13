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

let line = DEFAULT_LINE
let tone: MascotTone = 'neutral'
let snapshot: MascotSay = { line, tone }

const SERVER_SNAPSHOT: MascotSay = { line: DEFAULT_LINE, tone: 'neutral' }

const listeners = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

function emit(): void {
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
    if (line === value && tone === valueTone) return
    line = value
    tone = valueTone
    emit()
  }, [])

  useEffect(() => {
    set(next, nextTone)
  }, [next, nextTone, set])
}
