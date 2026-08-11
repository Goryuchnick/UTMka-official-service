import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * Клиент Supabase — только серверный и только под service-role.
 *
 * Проект общий с курсом, поэтому таблицы инструмента живут в отдельной схеме
 * `utmka` (ARCHITECTURE §5.2): клиент настроен на неё, и дальше имена таблиц
 * пишутся без префиксов. Схема должна быть добавлена в PostgREST →
 * Exposed schemas, иначе запросы вернут ошибку «schema must be one of…».
 *
 * Публичный anon-ключ приложению не нужен: RLS включён, политик нет, наружу
 * из браузера не ходит ни один запрос к БД.
 */

const SCHEMA = 'utmka'

/**
 * Тип клиента выводится из `createClient`, а не пишется руками: дженерик несёт
 * имя схемы, и явная аннотация `SupabaseClient` схлопнула бы его в `public`.
 */
type Client = ReturnType<typeof make>

function make() {
  const url = process.env.SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !key) {
    throw new Error('SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не заданы')
  }

  return createClient(url, key, {
    db: { schema: SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

let cached: Client | null = null

export function supabase(): Client {
  cached ??= make()
  return cached
}

/** Настроен ли Supabase вообще. Экраны без входа обязаны работать и без него. */
export function storageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}
