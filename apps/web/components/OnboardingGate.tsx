'use client'

/**
 * Первый визит — показать обучение. Живёт в рамке устройства, чтобы не зависеть
 * от того, на какой экран человек попал по ссылке.
 *
 * Решение «показывать или нет» читается из localStorage при монтировании через
 * `useSyncExternalStore`: на сервере его нет, а установка стейта в эффекте дала
 * бы лишний каскад рендеров.
 */

import { useCallback, useState, useSyncExternalStore } from 'react'

import { Onboarding, shouldShowOnboarding } from './Onboarding'

const NO_CHANGES = () => () => {}
const NOT_ON_SERVER = () => false

export function OnboardingGate() {
  const firstVisit = useSyncExternalStore(NO_CHANGES, shouldShowOnboarding, NOT_ON_SERVER)
  const [closed, setClosed] = useState(false)

  const close = useCallback(() => setClosed(true), [])

  return <Onboarding open={firstVisit && !closed} onClose={close} />
}
