/**
 * Справочник значений — то, ради чего инструментом пользуются повторно
 * (ASSISTANT-SPEC §2.3).
 *
 * Главная боль UTM — зоопарк `facebook` / `Facebook` / `fb` / `fb_ads` внутри
 * одной команды, из-за которого рассыпаются отчёты. Здесь: автодополнение,
 * предупреждение о новом значении, детектор расщепления и сведение алиасов.
 */

import { normalizeValue } from './normalize.js'
import type { DictEntry, DictKind } from './types.js'

/**
 * Известные синонимы. Пары ниже — не догадки алгоритма, а то, что человек
 * действительно пишет по-разному, имея в виду одно и то же.
 */
const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['vk', 'vkontakte', 'vk_com', 'vkcom'],
  ['telegram', 'tg', 'tme', 't_me', 'telega'],
  ['facebook', 'fb'],
  ['instagram', 'ig', 'insta'],
  ['yandex', 'ya', 'yandeks'],
  ['google', 'goo', 'adwords', 'google_ads'],
  ['dzen', 'zen', 'yandex_dzen'],
  ['odnoklassniki', 'ok'],
  ['youtube', 'yt'],
  ['email', 'mail', 'e_mail', 'newsletter', 'rassylka'],
  ['whatsapp', 'wa'],
  ['cpc', 'ppc', 'paid', 'ads'],
  ['social', 'smm', 'soc'],
]

const SYNONYM_OF = new Map<string, string>()
for (const group of SYNONYM_GROUPS) {
  const head = group[0]
  if (!head) continue
  for (const word of group) SYNONYM_OF.set(word, head)
}

/** Расстояние Левенштейна. Нужно, чтобы ловить опечатки: `yandx` ↔ `yandex`. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      )
    }
    prev = curr
  }
  return prev[b.length] ?? 0
}

/**
 * Считаются ли два значения написаниями одного и того же.
 *
 * Три правила, от надёжного к рискованному:
 * 1) после нормализации совпадают — это точно одно и то же;
 * 2) состоят в одной группе синонимов;
 * 3) отличаются одной-двумя буквами при длине от четырёх — опечатка,
 *    либо одно является приставкой другого (`vk` и `vk_ads`).
 */
export function looksLikeSame(a: string, b: string): boolean {
  const left = normalizeValue(a)
  const right = normalizeValue(b)
  if (!left || !right) return false
  if (left === right) return true

  const leftHead = SYNONYM_OF.get(left)
  const rightHead = SYNONYM_OF.get(right)
  if (leftHead && rightHead && leftHead === rightHead) return true

  const shorter = left.length <= right.length ? left : right
  const longer = left.length <= right.length ? right : left
  if (shorter.length >= 2 && longer.startsWith(`${shorter}_`)) return true

  if (Math.min(left.length, right.length) >= 4 && levenshtein(left, right) <= 2) return true

  return false
}

/** Известно ли значение справочнику (точное совпадение после нормализации). */
export function isKnown(entries: readonly DictEntry[], kind: DictKind, value: string): boolean {
  const target = normalizeValue(value)
  if (!target) return false
  return entries.some((e) => e.kind === kind && normalizeValue(e.value) === target)
}

/** Автодополнение: значения того же вида по префиксу, частые — выше. */
export function suggest(
  entries: readonly DictEntry[],
  kind: DictKind,
  prefix: string,
  limit = 8,
): DictEntry[] {
  const needle = normalizeValue(prefix)
  return entries
    .filter((e) => e.kind === kind && !e.canonical)
    .filter((e) => (needle ? normalizeValue(e.value).startsWith(needle) : true))
    .sort((a, b) => b.uses - a.uses || a.value.localeCompare(b.value))
    .slice(0, limit)
}

/**
 * Похожие значения для предупреждения «такого вы раньше не использовали».
 * Пусто — значит значение либо уже знакомо, либо действительно новое.
 */
export function findSimilar(
  entries: readonly DictEntry[],
  kind: DictKind,
  value: string,
  limit = 3,
): DictEntry[] {
  const target = normalizeValue(value)
  if (!target) return []
  if (isKnown(entries, kind, value)) return []

  return entries
    .filter((e) => e.kind === kind && looksLikeSame(e.value, value))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, limit)
}

/** Группа расщепления: несколько написаний одного смысла. */
export interface SplitGroup {
  kind: DictKind
  /** Самое частое написание — кандидат в канон. */
  suggested: string
  variants: DictEntry[]
  /** Сколько всего переходов размечено этими написаниями. */
  totalUses: number
}

/**
 * Детектор расщепления: «у вас telegram, tg и messenger — отчёты по ним
 * не сойдутся». Строим компоненты связности по `looksLikeSame` и берём те,
 * где написаний больше одного.
 */
export function detectSplits(entries: readonly DictEntry[]): SplitGroup[] {
  const groups: SplitGroup[] = []
  const kinds = [...new Set(entries.map((e) => e.kind))]

  for (const kind of kinds) {
    const pool = entries.filter((e) => e.kind === kind && !e.canonical)
    const visited = new Set<string>()

    for (const entry of pool) {
      if (visited.has(entry.value)) continue

      const cluster: DictEntry[] = []
      const queue = [entry]
      visited.add(entry.value)

      while (queue.length) {
        const current = queue.shift()
        if (!current) break
        cluster.push(current)
        for (const candidate of pool) {
          if (visited.has(candidate.value)) continue
          if (looksLikeSame(current.value, candidate.value)) {
            visited.add(candidate.value)
            queue.push(candidate)
          }
        }
      }

      if (cluster.length < 2) continue

      const sorted = [...cluster].sort((a, b) => b.uses - a.uses)
      const head = sorted[0]
      if (!head) continue

      groups.push({
        kind,
        suggested: head.value,
        variants: sorted,
        totalUses: sorted.reduce((sum, e) => sum + e.uses, 0),
      })
    }
  }

  return groups.sort((a, b) => b.totalUses - a.totalUses)
}

/** Учесть использование значения: новое добавить, известному поднять счётчик. */
export function upsertEntry(
  entries: readonly DictEntry[],
  kind: DictKind,
  value: string,
  now?: string,
): DictEntry[] {
  const clean = value.trim()
  if (!clean) return [...entries]

  const at = entries.findIndex((e) => e.kind === kind && e.value === clean)
  if (at === -1) {
    return [...entries, { kind, value: clean, uses: 1, firstSeenAt: now, lastUsedAt: now }]
  }

  const next = [...entries]
  const found = next[at]
  if (!found) return next
  next[at] = { ...found, uses: found.uses + 1, lastUsedAt: now ?? found.lastUsedAt }
  return next
}

/**
 * Свести написание к канону. Алиас остаётся в справочнике с пометкой
 * `canonical` — чтобы автодополнение его больше не предлагало, но история
 * старых ссылок оставалась объяснимой.
 */
export function mergeInto(
  entries: readonly DictEntry[],
  kind: DictKind,
  alias: string,
  canonical: string,
): DictEntry[] {
  return entries.map((entry) =>
    entry.kind === kind && entry.value === alias ? { ...entry, canonical } : entry,
  )
}

/** Канон для значения, если оно помечено алиасом. */
export function resolveCanonical(
  entries: readonly DictEntry[],
  kind: DictKind,
  value: string,
): string {
  const found = entries.find((e) => e.kind === kind && e.value === value)
  return found?.canonical ?? value
}
