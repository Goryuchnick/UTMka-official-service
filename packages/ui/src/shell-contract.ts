/**
 * Типовая сторона алиаса `#shell` — то, что пакет вправе ожидать от оболочки.
 *
 * Только объявления: рантайма здесь нет и быть не должно. При сборке
 * приложения алиас `#shell` указывает на его собственный `shell.ts`, а этот
 * файл нужен, чтобы `@utmka/ui` проверялся типами сам по себе, без хоста.
 * Разойдётся реализация с контрактом — это увидит `tsc` у приложения.
 */

import type { SaveFile, UtmkaBackend } from '@utmka/core'

import type { Nav, NavLink as NavLinkType, UseNavParams } from './nav'

export declare const backend: UtmkaBackend
export declare const saveFile: SaveFile
export declare function useNav(): Nav
export declare const useNavParams: UseNavParams
export declare const NavLink: NavLinkType
