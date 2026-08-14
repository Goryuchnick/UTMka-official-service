/**
 * Подсказки тегов — паритет с 2.2 (`getPopularTags` / `getRecentTags`).
 *
 * Тег у шаблона не справочный, а рабочий: им помечают клиента, сезон или
 * проект, и один и тот же тег ставят десяткам наборов подряд. Набирать его
 * каждый раз руками — это не только лишние нажатия, но и прямой путь к
 * расщеплению («Альпина» и «альпина» станут двумя тегами с разными цветами).
 *
 * Отсюда два источника: чем помечено больше всего шаблонов и что ставили
 * последним. Правила чистые и живут в ядре, потому что подсказки нужны и в
 * библиотеке, и при сохранении из генератора — а в 2.2 они рисовались двумя
 * копиями одного кода.
 */

/** Тег как его показывают в подсказке: имя плюс цвет, если он был. */
export interface TagHint {
  name: string
  color?: string
}

/** Сколько подсказок в строке. Больше — уже не подсказка, а второй список. */
export const TAG_HINTS_SHOWN = 3

interface Tagged {
  tagName?: string
  tagColor?: string
}

/** Ключ сравнения: теги, различающиеся регистром, — это один тег. */
function key(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Самые частые теги — по числу помеченных шаблонов.
 *
 * Написание берётся у первого встреченного, а не «последнее победило»:
 * иначе подсказка меняет вид от одной правки к другой.
 */
export function popularTags(
  templates: readonly Tagged[],
  limit: number = TAG_HINTS_SHOWN,
): TagHint[] {
  const counted = new Map<string, { hint: TagHint; count: number }>()

  for (const template of templates) {
    const name = template.tagName?.trim()
    if (!name) continue

    const found = counted.get(key(name))
    if (found) {
      found.count += 1
      // Цвет мог быть проставлен не у первого шаблона с этим тегом.
      if (!found.hint.color && template.tagColor) found.hint.color = template.tagColor
    } else {
      counted.set(key(name), {
        hint: { name, color: template.tagColor || undefined },
        count: 1,
      })
    }
  }

  return [...counted.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
    .map((row) => row.hint)
}

/**
 * Последние использованные теги — из истории, она уже отдаётся свежим сверху.
 *
 * `exclude` убирает то, что и так показано в популярных: две одинаковые строки
 * подсказок рядом выглядят как ошибка интерфейса.
 */
export function recentTags(
  history: readonly Tagged[],
  limit: number = TAG_HINTS_SHOWN,
  exclude: readonly TagHint[] = [],
): TagHint[] {
  const skip = new Set(exclude.map((hint) => key(hint.name)))
  const seen = new Set<string>()
  const found: TagHint[] = []

  for (const item of history) {
    const name = item.tagName?.trim()
    if (!name) continue

    const id = key(name)
    if (skip.has(id) || seen.has(id)) continue

    seen.add(id)
    found.push({ name, color: item.tagColor || undefined })
    if (found.length >= limit) break
  }

  return found
}
