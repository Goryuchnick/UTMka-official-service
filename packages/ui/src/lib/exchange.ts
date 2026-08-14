'use client'

import { rowsToCsv } from '@utmka/core'

import { saveFile } from '../shell'

/**
 * Выгрузка файлов из интерфейса.
 *
 * Сами форматы (что кладём в JSON, какие колонки в CSV, как разбираем чужой
 * файл) живут в ядре — они одни на веб и десктоп и покрыты тестами. Здесь
 * остаётся ровно одно: попросить оболочку положить готовый текст на диск.
 */

export async function exportJson(name: string, payload: unknown): Promise<void> {
  await saveFile(`${name}.json`, 'application/json', JSON.stringify(payload, null, 2))
}

export async function exportCsv(name: string, rows: string[][]): Promise<void> {
  /* Разделитель — точка с запятой: Excel с русской локалью иначе кладёт всю
     строку в одну ячейку. BOM — чтобы он же не съел кириллицу. */
  await saveFile(`${name}.csv`, 'text/csv', `﻿${rowsToCsv(rows, ';')}`)
}
