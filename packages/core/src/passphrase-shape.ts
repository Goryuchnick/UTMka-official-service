/**
 * Форма кодовой фразы — чистые функции без `crypto`.
 *
 * Вынесены из `lib/passphrase.ts` затем, что предупреждать о неверной раскладке
 * надо на вводе, в браузере, а не после отправки на сервер. Сам HMAC остаётся
 * серверным и в клиент не попадает никогда.
 */

/**
 * Нормализация перед сравнением и хешированием. Без неё один и тот же на вид
 * текст даёт разные результаты: macOS отдаёт кириллицу в разложенной форме,
 * «ё» пишут как попало, разделителем бывает пробел.
 */
export function normalizePassphrase(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[\s_+]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Буквы одного из алфавитов, цифры, минимум три части через дефис. */
export function isValidPassphraseShape(input: string): boolean {
  const norm = normalizePassphrase(input)
  if (!/^[a-zа-я0-9-]{8,128}$/.test(norm)) return false
  return norm.split('-').filter(Boolean).length >= 3
}

/**
 * Смешанные алфавиты почти всегда означают неверную раскладку: человек думает,
 * что печатает кириллицей, а часть символов латинские. Молча хешировать такое
 * жестоко — вход просто не найдётся, и причину не объяснить.
 */
export function hasMixedScripts(input: string): boolean {
  const norm = normalizePassphrase(input)
  return /[a-z]/.test(norm) && /[а-я]/.test(norm)
}
