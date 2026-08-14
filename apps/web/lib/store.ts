import 'server-only'

import {
  HISTORY_LIMIT,
  STORAGE_MESSAGES,
  TEMPLATES_LIMIT,
  UTM_KEYS,
  type DictEntry,
  type DictKind,
  type HistoryItem,
  type Template,
  type UtmParams,
} from '@utmka/core'

import { supabase } from './supabase'

/**
 * Хранилище за кодовой фразой — реализация портов `@utmka/core` поверх
 * Supabase. Живёт только на сервере: браузер ходит сюда через роуты `/api/*`,
 * ключ service-role в клиент не попадает никогда.
 *
 * Потолки (500 записей) держим чисткой при вставке, как в 2.2, а не триггером:
 * так поведение одинаково для веба и будущего десктопа на SQLite.
 */

/* ─────────────────────────── шаблоны ─────────────────────────── */

interface TemplateRow {
  id: string
  name: string
  base_url: string
  params: UtmParams
  tag_name: string | null
  tag_color: string | null
  preset_id: string | null
  created_at: string
  updated_at: string
}

function toTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    params: row.params ?? {},
    tagName: row.tag_name ?? undefined,
    tagColor: row.tag_color ?? undefined,
    presetId: row.preset_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listTemplates(userHash: string): Promise<Template[]> {
  const { data, error } = await supabase()
    .from('templates')
    .select('*')
    .eq('user_hash', userHash)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as TemplateRow[]).map(toTemplate)
}

export async function createTemplate(
  userHash: string,
  input: Omit<Template, 'id'>,
): Promise<Template> {
  const { count } = await supabase()
    .from('templates')
    .select('id', { count: 'exact', head: true })
    .eq('user_hash', userHash)

  if ((count ?? 0) >= TEMPLATES_LIMIT) {
    throw new Error(STORAGE_MESSAGES.templatesFull)
  }

  const { data, error } = await supabase()
    .from('templates')
    .insert({
      user_hash: userHash,
      name: input.name,
      base_url: input.baseUrl ?? '',
      params: input.params ?? {},
      tag_name: input.tagName ?? null,
      tag_color: input.tagColor ?? null,
      preset_id: input.presetId ?? null,
    })
    .select('*')
    .single()

  // 23505 — уникальный индекс по (user_hash, lower(name)).
  if (error) {
    throw new Error(error.code === '23505' ? STORAGE_MESSAGES.nameTaken : error.message)
  }
  return toTemplate(data as TemplateRow)
}

export async function updateTemplate(
  userHash: string,
  id: string,
  patch: Partial<Omit<Template, 'id'>>,
): Promise<Template> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name
  if (patch.baseUrl !== undefined) row.base_url = patch.baseUrl
  if (patch.params !== undefined) row.params = patch.params
  if (patch.tagName !== undefined) row.tag_name = patch.tagName ?? null
  if (patch.tagColor !== undefined) row.tag_color = patch.tagColor ?? null
  if (patch.presetId !== undefined) row.preset_id = patch.presetId ?? null

  const { data, error } = await supabase()
    .from('templates')
    .update(row)
    .eq('user_hash', userHash)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.code === '23505' ? STORAGE_MESSAGES.nameTaken : error.message)
  }
  return toTemplate(data as TemplateRow)
}

export async function removeTemplate(userHash: string, id: string): Promise<void> {
  const { error } = await supabase()
    .from('templates')
    .delete()
    .eq('user_hash', userHash)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/* ─────────────────────────── история ─────────────────────────── */

interface LinkRow {
  id: string
  url: string
  base_url: string
  params: UtmParams
  short_url: string | null
  tag_name: string | null
  tag_color: string | null
  origin: HistoryItem['origin']
  batch_id: string | null
  created_at: string
}

function toHistory(row: LinkRow): HistoryItem {
  return {
    id: row.id,
    url: row.url,
    baseUrl: row.base_url,
    params: row.params ?? {},
    shortUrl: row.short_url ?? undefined,
    tagName: row.tag_name ?? undefined,
    tagColor: row.tag_color ?? undefined,
    origin: row.origin,
    batchId: row.batch_id ?? undefined,
    createdAt: row.created_at,
  }
}

export async function listHistory(userHash: string, limit = HISTORY_LIMIT): Promise<HistoryItem[]> {
  const { data, error } = await supabase()
    .from('links')
    .select('*')
    .eq('user_hash', userHash)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, HISTORY_LIMIT))

  if (error) throw new Error(error.message)
  return (data as LinkRow[]).map(toHistory)
}

export async function addHistory(
  userHash: string,
  input: Omit<HistoryItem, 'id'>,
): Promise<HistoryItem> {
  const { data, error } = await supabase()
    .from('links')
    .insert({
      user_hash: userHash,
      url: input.url,
      base_url: input.baseUrl ?? '',
      params: input.params ?? {},
      short_url: input.shortUrl ?? null,
      tag_name: input.tagName ?? null,
      tag_color: input.tagColor ?? null,
      origin: input.origin,
      batch_id: input.batchId ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await trimHistory(userHash)
  await trackValues(userHash, input.params ?? {})

  return toHistory(data as LinkRow)
}

/** Потолок истории: лишнее снизу выкидываем сразу после вставки. */
async function trimHistory(userHash: string): Promise<void> {
  const { data, error } = await supabase()
    .from('links')
    .select('id')
    .eq('user_hash', userHash)
    .order('created_at', { ascending: false })
    .range(HISTORY_LIMIT, HISTORY_LIMIT + 199)

  if (error || !data || data.length === 0) return
  await supabase()
    .from('links')
    .delete()
    .in('id', (data as { id: string }[]).map((row) => row.id))
}

export async function removeHistory(userHash: string, id: string): Promise<void> {
  const { error } = await supabase().from('links').delete().eq('user_hash', userHash).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function clearHistory(userHash: string): Promise<void> {
  const { error } = await supabase().from('links').delete().eq('user_hash', userHash)
  if (error) throw new Error(error.message)
}

/* ─────────────────────────── справочник ─────────────────────────── */

interface DictRow {
  kind: DictKind
  value: string
  uses: number
  canonical: string | null
  first_seen_at: string
  last_used_at: string
}

export async function listDictionary(userHash: string): Promise<DictEntry[]> {
  const { data, error } = await supabase()
    .from('dict_values')
    .select('kind, value, uses, canonical, first_seen_at, last_used_at')
    .eq('user_hash', userHash)
    .order('uses', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as DictRow[]).map((row) => ({
    kind: row.kind,
    value: row.value,
    uses: row.uses,
    canonical: row.canonical ?? undefined,
    firstSeenAt: row.first_seen_at,
    lastUsedAt: row.last_used_at,
  }))
}

/**
 * Учесть значения собранной ссылки. Инкремент делаем чтением-записью, а не
 * `upsert` со счётчиком: гонок здесь нет — пишет один человек со своей фразой,
 * а хранимая функция ради этого не окупается.
 */
export async function trackValues(userHash: string, params: UtmParams): Promise<void> {
  const now = new Date().toISOString()

  for (const kind of UTM_KEYS) {
    const value = (params[kind] ?? '').trim()
    if (!value) continue

    const { data } = await supabase()
      .from('dict_values')
      .select('id, uses')
      .eq('user_hash', userHash)
      .eq('kind', kind)
      .eq('value', value)
      .maybeSingle()

    if (data) {
      await supabase()
        .from('dict_values')
        .update({ uses: (data as { uses: number }).uses + 1, last_used_at: now })
        .eq('id', (data as { id: string }).id)
    } else {
      await supabase()
        .from('dict_values')
        .insert({ user_hash: userHash, kind, value, uses: 1, last_used_at: now })
    }
  }
}

/** Свести расщепление: алиас начинает указывать на канон. */
export async function mergeValue(
  userHash: string,
  kind: DictKind,
  alias: string,
  canonical: string,
): Promise<void> {
  const { error } = await supabase()
    .from('dict_values')
    .update({ canonical })
    .eq('user_hash', userHash)
    .eq('kind', kind)
    .eq('value', alias)
  if (error) throw new Error(error.message)
}

export async function removeValue(userHash: string, kind: DictKind, value: string): Promise<void> {
  const { error } = await supabase()
    .from('dict_values')
    .delete()
    .eq('user_hash', userHash)
    .eq('kind', kind)
    .eq('value', value)
  if (error) throw new Error(error.message)
}

/* ─────────────────────────── обмен с приложением ─────────────────────────── */

/**
 * Всё содержимое аккаунта одним запросом — для синхронизации с десктопом.
 *
 * Отдельно от `listTemplates`/`listHistory` не ради экономии: приложению нужен
 * снимок обеих таблиц на один момент, иначе между двумя запросами человек
 * успевает что-то сохранить в браузере, и план слияния считается по данным,
 * которых уже нет.
 */
export async function syncPull(
  userHash: string,
): Promise<{ templates: Template[]; links: HistoryItem[] }> {
  const [templates, links] = await Promise.all([
    listTemplates(userHash),
    listHistory(userHash),
  ])
  return { templates, links }
}

export interface SyncPushResult {
  templatesAdded: number
  linksAdded: number
  /** Имена шаблонов, которые сервер не принял (обычно имя уже занято). */
  skipped: string[]
}

/**
 * Приём пачки от приложения.
 *
 * ⚠️ Даты сохраняются **как есть**: `addHistory` ставит серверное «сейчас», и
 * через него вся принесённая история схлопнулась бы в сегодня — ровно та
 * грабля, из-за которой перенос из 2.2 идёт чтением базы, а не штатным
 * экспортом. Поэтому здесь своя вставка с явными `created_at`.
 *
 * Решение о том, что именно слать, принимает клиент по правилам ядра
 * (`planTemplates`/`planHistory`). Сервер всё равно проверяет дубли: повторный
 * запрос — обычное дело при обрыве связи, и задваивать записи он не должен.
 */
export async function syncPush(
  userHash: string,
  input: { templates?: Omit<Template, 'id'>[]; links?: Omit<HistoryItem, 'id'>[] },
): Promise<SyncPushResult> {
  const skipped: string[] = []
  let templatesAdded = 0
  let linksAdded = 0

  const templates = input.templates ?? []
  if (templates.length > 0) {
    const existing = await listTemplates(userHash)
    const taken = new Set(existing.map((item) => item.name.trim().toLowerCase()))
    let room = TEMPLATES_LIMIT - existing.length

    const rows = []
    for (const item of templates) {
      const name = item.name?.trim()
      if (!name) continue
      if (taken.has(name.toLowerCase())) {
        skipped.push(name)
        continue
      }
      if (room <= 0) {
        skipped.push(name)
        continue
      }
      taken.add(name.toLowerCase())
      room -= 1
      rows.push({
        user_hash: userHash,
        name,
        base_url: item.baseUrl ?? '',
        params: item.params ?? {},
        tag_name: item.tagName ?? null,
        tag_color: item.tagColor ?? null,
        preset_id: item.presetId ?? null,
        // Даты приложения: шаблон мог быть заведён год назад.
        created_at: item.createdAt ?? new Date().toISOString(),
        updated_at: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
      })
    }

    if (rows.length > 0) {
      const { error } = await supabase().from('templates').insert(rows)
      if (error) throw new Error(error.message)
      templatesAdded = rows.length
    }
  }

  const links = input.links ?? []
  if (links.length > 0) {
    const existing = await listHistory(userHash)
    // Тот же ключ, что в ядре: ссылка плюс секунда сохранения.
    const seen = new Set(
      existing.map((item) => `${item.url} ${(item.createdAt ?? '').slice(0, 19)}`),
    )

    const rows = []
    for (const item of links) {
      if (!item.url) continue
      const key = `${item.url} ${(item.createdAt ?? '').slice(0, 19)}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({
        user_hash: userHash,
        url: item.url,
        base_url: item.baseUrl ?? '',
        params: item.params ?? {},
        short_url: item.shortUrl ?? null,
        tag_name: item.tagName ?? null,
        tag_color: item.tagColor ?? null,
        origin: item.origin ?? 'single',
        batch_id: item.batchId ?? null,
        created_at: item.createdAt ?? new Date().toISOString(),
      })
    }

    if (rows.length > 0) {
      const { error } = await supabase().from('links').insert(rows)
      if (error) throw new Error(error.message)
      linksAdded = rows.length

      // Потолок и справочник — как при обычном сохранении: справочник
      // наполняется только побочным эффектом вставки, отдельной ручки нет.
      await trimHistory(userHash)
      for (const row of rows) await trackValues(userHash, row.params as UtmParams)
    }
  }

  return { templatesAdded, linksAdded, skipped }
}
