/**
 * `@utmka/ui` — экраны UTMka.
 *
 * Один набор компонентов на обе оболочки. Всё, что зависит от окружения —
 * данные, сеть, навигация, сохранение файлов, — приходит через алиас `#shell`,
 * поэтому здесь нет ни `fetch`, ни `next/*`, ни `invoke`.
 *
 * Различие оболочек живёт в композиции: веб собирает свой набор экранов,
 * десктоп — свой. Чего в десктопе нет, видно в дереве файлов приложения,
 * а не в рантайм-флагах внутри разметки.
 */

export { DeviceFrame, SECTIONS } from './components/DeviceFrame'
export { GeneratorScreen } from './components/generator/GeneratorScreen'
export { BatchScreen } from './components/BatchScreen'
export { ParseScreen } from './components/ParseScreen'
export { HistoryScreen } from './components/HistoryScreen'
export { TemplatesScreen, TAG_COLORS } from './components/TemplatesScreen'
export { HelpScreen } from './components/HelpScreen'
export { LoginScreen } from './components/LoginScreen'
export { VaultGate } from './components/VaultGate'
export { Soon } from './components/Soon'
export { PixelIcon, type IconName } from './components/PixelIcon'
export { ChainMark } from './components/ChainMark'

export type { Nav, NavLink, UseNavParams } from './nav'

export { THEME_BOOTSTRAP, THEME_KEY, useTheme, type Theme } from './lib/theme'
export { DRAFT_BOOTSTRAP, readBootstrapDraft } from './lib/draft-bootstrap'
export { useAccount, refreshAccount, setAccount, logout, type AccountState } from './lib/account'
export { useSetMascotLine, type MascotTone } from './lib/mascot'
