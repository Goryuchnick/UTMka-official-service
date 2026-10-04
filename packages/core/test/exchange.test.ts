import { describe, expect, it } from 'vitest'

import { detectDelimiter, parseCsv, pickColumn, rowsToCsv } from '../src/csv'
import {
  historyToCsv,
  historyToJson,
  parseHistory,
  parseTemplatesCsv,
  parseTemplatesJson,
} from '../src/exchange'

describe('CSV — один разбор на весь проект', () => {
  it('понимает и запятую, и точку с запятой', () => {
    /* Excel с русской локалью выгружает через `;`, английский — через `,`.
       Раньше пакетный режим знал только запятую и складывал русскую выгрузку
       в одну колонку, а импорт шаблонов разделитель определял. */
    expect(detectDelimiter('name;url;utm_source')).toBe(';')
    expect(detectDelimiter('name,url,utm_source')).toBe(',')
  })

  it('понимает таб — ячейки, скопированные из Excel в буфер', () => {
    expect(detectDelimiter('Метка\tИсточник\tКанал')).toBe('\t')
    // Запятая внутри ячейки не перебивает таб.
    expect(detectDelimiter('Лето, 2026\tИсточник')).toBe('\t')
  })

  it('перенос строки внутри кавычек остаётся в ячейке', () => {
    const rows = parseCsv('name;note\r\n"Осень";"две\r\nстроки"\r\nЗима;одна')
    expect(rows).toEqual([
      { name: 'Осень', note: 'две\r\nстроки' },
      { name: 'Зима', note: 'одна' },
    ])
  })

  it('снимает BOM с первого заголовка', () => {
    // Наши же выгрузки идут с BOM — иначе Excel съедает кириллицу. Без снятия
    // первый заголовок назывался бы «﻿name» и не находился никогда.
    const rows = parseCsv('﻿name;utm_source\nОсень;vk')
    expect(rows[0]?.name).toBe('Осень')
  })

  it('читает кавычки с удвоением и разделитель внутри них', () => {
    const rows = parseCsv('name,value\n"Лето, 2026","он сказал ""да"""')
    expect(rows[0]?.name).toBe('Лето, 2026')
    expect(rows[0]?.value).toBe('он сказал "да"')
  })

  it('заголовки сохраняются как есть, а ищутся без учёта регистра', () => {
    /* Разбор не искажает данные — иначе выгрузка и чтение обратно перестают
       совпадать. Регистр и синонимы — забота `pickColumn`. */
    const rows = parseCsv('Name;UTM_Source\nОсень;vk')
    expect(Object.keys(rows[0] ?? {})).toEqual(['Name', 'UTM_Source'])
    expect(pickColumn(rows[0] ?? {}, ['name'])).toBe('Осень')
    expect(pickColumn(rows[0] ?? {}, ['utm_source'])).toBe('vk')
  })
})

describe('импорт шаблонов', () => {
  it('CSV с русскими заголовками — теми же синонимами, что в пакетном режиме', () => {
    const rows = parseTemplatesCsv('Название;Адрес;Источник;Канал\nОсень;site.ru;vk;social')

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      name: 'Осень',
      baseUrl: 'site.ru',
      params: { source: 'vk', medium: 'social' },
    })
  })

  it('строка без имени пропускается, а не роняет импорт', () => {
    const rows = parseTemplatesCsv('name;utm_source\n;vk\nОсень;yandex')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('Осень')
  })

  it('JSON формата 3.0 и плоский формат 2.2 читаются одинаково', () => {
    const own = parseTemplatesJson(
      JSON.stringify({ kind: 'utmka.templates', items: [{ name: 'Осень', params: { source: 'vk' } }] }),
    )
    // В 2.2 поля лежали плоско и с префиксом `utm_`.
    const legacy = parseTemplatesJson(JSON.stringify([{ name: 'Осень', utm_source: 'vk' }]))

    expect(own[0]?.params).toEqual({ source: 'vk' })
    expect(legacy[0]?.params).toEqual({ source: 'vk' })
  })

  it('битый JSON даёт пустой список, а не исключение', () => {
    expect(parseTemplatesJson('{это не json')).toEqual([])
  })
})

describe('импорт истории', () => {
  it('опознаёт запись по адресу, а не по имени', () => {
    /* У записи истории имени нет и не должно быть — идти через шаблонный
       разбор нельзя, тот требует `name` и выбросил бы всё. */
    const rows = parseHistory('url;utm_source\nhttps://site.ru/a;vk', true)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ url: 'https://site.ru/a', origin: 'single' })
  })

  it('JSON нашей же выгрузки читается обратно', () => {
    const rows = parseHistory(
      JSON.stringify({
        kind: 'utmka.history',
        items: [{ url: 'https://site.ru/a', baseUrl: 'https://site.ru/a', params: { source: 'vk' } }],
      }),
      false,
    )

    expect(rows[0]?.params).toEqual({ source: 'vk' })
  })

  it('строка без адреса пропускается', () => {
    expect(parseHistory('url;utm_source\n;vk', true)).toHaveLength(0)
  })

  it('дата и короткая ссылка переживают выгрузку и загрузку', () => {
    /* Без даты перенесённая история схлопывалась в день импорта: вся лента
       вставала на «сегодня», и искать по периоду становилось бессмысленно. */
    const item = {
      id: '1',
      url: 'https://site.ru/a?utm_source=vk',
      baseUrl: 'https://site.ru/a',
      params: { source: 'vk' },
      shortUrl: 'https://clck.ru/abc',
      origin: 'single' as const,
      createdAt: '2026-05-27T10:02:40.000Z',
    }

    const fromJson = parseHistory(JSON.stringify(historyToJson([item])), false)[0]
    expect(fromJson).toMatchObject({ shortUrl: 'https://clck.ru/abc', createdAt: '2026-05-27T10:02:40.000Z' })

    const csv = rowsToCsv(historyToCsv([item]))
    const fromCsv = parseHistory(csv, true)[0]
    expect(fromCsv).toMatchObject({ shortUrl: 'https://clck.ru/abc', createdAt: '2026-05-27T10:02:40.000Z' })
  })

  it('неразборчивую дату не выдумывает', () => {
    const rows = parseHistory('url;created_at\nhttps://site.ru/a;вчера', true)
    expect(rows[0]?.createdAt).toBeUndefined()
  })
})
