//! Операции хранилища.
//!
//! Здесь живут правила, которые обязаны совпадать с вебом: потолок истории,
//! потолок шаблонов, уникальность имени и — главное — наполнение справочника
//! при сохранении ссылки. Всё, что в вебе делалось тремя запросами подряд,
//! здесь укладывается в одну транзакцию.
//!
//! Функции принимают `Connection`/`Transaction`, а не пул: так они проверяются
//! тестами на базе в памяти, без Tauri и без файлов.

use rusqlite::{params, Connection, OptionalExtension, Row, Transaction};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

use crate::error::{CmdError, CmdResult};
use crate::models::*;

/// Текущий момент в ISO-8601 UTC — тот же формат, что кладёт веб.
pub fn now() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| String::from("1970-01-01T00:00:00Z"))
}

fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn params_to_json(params: &UtmParams) -> String {
    serde_json::to_string(params).unwrap_or_else(|_| String::from("{}"))
}

fn params_from_json(raw: &str) -> UtmParams {
    serde_json::from_str(raw).unwrap_or_default()
}

/// Пустая строка на входе означает «нет значения», а не «пустая строка».
fn clean(value: Option<String>) -> Option<String> {
    value.map(|text| text.trim().to_string()).filter(|text| !text.is_empty())
}

/// Ключ уникальности имени шаблона.
///
/// Считается здесь, а не индексом по `lower(name)`: встроенный `lower()` в
/// SQLite понижает регистр только латиницы, и «Осень» с «ОСЕНЬ» разошлись бы
/// на два шаблона — при том, что веб такой дубль отклоняет, а имена у
/// пользователя русские. `to_lowercase()` в Rust знает Unicode.
pub fn name_key(name: &str) -> String {
    name.trim().to_lowercase()
}

/* ─────────────────────────── шаблоны ─────────────────────────── */

fn row_to_template(row: &Row<'_>) -> rusqlite::Result<Template> {
    let params: String = row.get("params")?;
    Ok(Template {
        id: row.get("id")?,
        name: row.get("name")?,
        base_url: row.get::<_, Option<String>>("base_url")?,
        params: params_from_json(&params),
        tag_name: row.get("tag_name")?,
        tag_color: row.get("tag_color")?,
        preset_id: row.get("preset_id")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

pub fn templates_list(conn: &Connection) -> CmdResult<Vec<Template>> {
    let mut stmt = conn.prepare(
        "select id, name, base_url, params, tag_name, tag_color, preset_id, created_at, updated_at \
         from templates order by updated_at desc",
    )?;
    let rows = stmt.query_map([], row_to_template)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn templates_create(tx: &Transaction<'_>, input: NewTemplate) -> CmdResult<Template> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err(CmdError::rejected(MESSAGE_NO_NAME));
    }

    // Потолок проверяем счётом в той же транзакции, а не констрейнтом: тот же
    // способ, что в вебе, и то же сообщение.
    let count: i64 = tx.query_row("select count(*) from templates", [], |row| row.get(0))?;
    if count as usize >= TEMPLATES_LIMIT {
        return Err(CmdError::limit(MESSAGE_TEMPLATES_FULL));
    }

    let stamp = now();
    let template = Template {
        id: new_id(),
        name,
        base_url: Some(input.base_url.unwrap_or_default()),
        params: input.params,
        tag_name: clean(input.tag_name),
        tag_color: clean(input.tag_color),
        preset_id: clean(input.preset_id),
        created_at: Some(stamp.clone()),
        updated_at: Some(stamp),
    };

    tx.execute(
        "insert into templates (id, name, name_key, base_url, params, tag_name, tag_color, preset_id, created_at, updated_at) \
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            template.id,
            template.name,
            name_key(&template.name),
            template.base_url.clone().unwrap_or_default(),
            params_to_json(&template.params),
            template.tag_name,
            template.tag_color,
            template.preset_id,
            template.created_at,
            template.updated_at,
        ],
    )?;

    Ok(template)
}

pub fn templates_update(
    tx: &Transaction<'_>,
    id: &str,
    patch: TemplatePatch,
) -> CmdResult<Template> {
    let mut current = templates_get(tx, id)?
        .ok_or_else(|| CmdError::rejected("Шаблон не найден — возможно, он уже удалён"))?;

    if let Some(name) = patch.name {
        let name = name.trim().to_string();
        if name.is_empty() {
            return Err(CmdError::rejected(MESSAGE_NO_NAME));
        }
        current.name = name;
    }
    if let Some(base_url) = patch.base_url {
        current.base_url = Some(base_url);
    }
    if let Some(params) = patch.params {
        current.params = params;
    }
    if let Some(tag_name) = patch.tag_name {
        current.tag_name = clean(Some(tag_name));
    }
    if let Some(tag_color) = patch.tag_color {
        current.tag_color = clean(Some(tag_color));
    }
    if let Some(preset_id) = patch.preset_id {
        current.preset_id = clean(Some(preset_id));
    }
    current.updated_at = Some(now());

    tx.execute(
        "update templates set name = ?2, name_key = ?3, base_url = ?4, params = ?5, tag_name = ?6, \
         tag_color = ?7, preset_id = ?8, updated_at = ?9 where id = ?1",
        params![
            current.id,
            current.name,
            name_key(&current.name),
            current.base_url.clone().unwrap_or_default(),
            params_to_json(&current.params),
            current.tag_name,
            current.tag_color,
            current.preset_id,
            current.updated_at,
        ],
    )?;

    Ok(current)
}

pub fn templates_get(conn: &Connection, id: &str) -> CmdResult<Option<Template>> {
    let mut stmt = conn.prepare(
        "select id, name, base_url, params, tag_name, tag_color, preset_id, created_at, updated_at \
         from templates where id = ?1",
    )?;
    Ok(stmt.query_row([id], row_to_template).optional()?)
}

pub fn templates_remove(conn: &Connection, id: &str) -> CmdResult<()> {
    conn.execute("delete from templates where id = ?1", [id])?;
    Ok(())
}

/// Пакетная запись шаблонов — одна транзакция на весь файл.
///
/// В вебе то же самое делает цикл запросов внутри адаптера; здесь пятьсот строк
/// не превращаются в пятьсот круглых поездок через IPC.
pub fn templates_import(tx: &Transaction<'_>, rows: Vec<NewTemplate>) -> CmdResult<ImportResult> {
    let mut result = ImportResult::default();

    for row in rows {
        let label = row.name.trim().to_string();
        match templates_create(tx, row) {
            Ok(_) => result.added += 1,
            // Конфликт имени и потолок — не повод ронять весь импорт: пишем,
            // какая именно строка не легла, и идём дальше.
            Err(error) => result.skipped.push(format!("{label} — {}", error.message)),
        }
    }

    Ok(result)
}

/* ─────────────────────────── история ─────────────────────────── */

fn row_to_link(row: &Row<'_>) -> rusqlite::Result<HistoryItem> {
    let params: String = row.get("params")?;
    Ok(HistoryItem {
        id: row.get("id")?,
        url: row.get("url")?,
        base_url: row.get("base_url")?,
        params: params_from_json(&params),
        short_url: row.get("short_url")?,
        tag_name: row.get("tag_name")?,
        tag_color: row.get("tag_color")?,
        origin: row.get("origin")?,
        batch_id: row.get("batch_id")?,
        created_at: row.get("created_at")?,
    })
}

pub fn history_list(conn: &Connection, limit: Option<usize>) -> CmdResult<Vec<HistoryItem>> {
    let limit = limit.unwrap_or(HISTORY_LIMIT).min(HISTORY_LIMIT) as i64;
    let mut stmt = conn.prepare(
        "select id, url, base_url, params, short_url, tag_name, tag_color, origin, batch_id, created_at \
         from links order by created_at desc, rowid desc limit ?1",
    )?;
    let rows = stmt.query_map([limit], row_to_link)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Записать ссылку.
///
/// ⚠️ Вставка, вытеснение и наполнение справочника — **одна транзакция**.
/// Справочник наполняется здесь и только здесь: отдельной ручки у него нет ни
/// в вебе, ни в контракте ядра. Голый `insert` не упадёт и ничего не скажет —
/// просто справочник останется пустым, а вместе с ним детектор расщеплений.
pub fn history_add(tx: &Transaction<'_>, input: NewHistoryItem) -> CmdResult<HistoryItem> {
    let url = input.url.trim().to_string();
    if url.is_empty() {
        return Err(CmdError::rejected(MESSAGE_NO_URL));
    }

    let item = HistoryItem {
        id: new_id(),
        url,
        base_url: input.base_url,
        params: input.params,
        short_url: clean(input.short_url),
        tag_name: clean(input.tag_name),
        tag_color: clean(input.tag_color),
        origin: normalize_origin(input.origin.as_deref()),
        batch_id: clean(input.batch_id),
        // Импорт приносит свою дату — иначе вся перенесённая история
        // схлопнулась бы в сегодня.
        created_at: Some(input.created_at.unwrap_or_else(now)),
    };

    tx.execute(
        "insert into links (id, url, base_url, params, short_url, tag_name, tag_color, origin, batch_id, created_at) \
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            item.id,
            item.url,
            item.base_url,
            params_to_json(&item.params),
            item.short_url,
            item.tag_name,
            item.tag_color,
            item.origin,
            item.batch_id,
            item.created_at,
        ],
    )?;

    trim_links(tx)?;
    track_values(tx, &item.params)?;

    Ok(item)
}

/// Потолок истории: лишнее снизу выкидываем в той же транзакции.
///
/// `rowid` — разрыв ничьей: при совпадении миллисекунды (импорт кладёт пачку
/// строк одним махом) порядок по одной дате неопределён, и вытеснялась бы
/// произвольная запись.
pub fn trim_links(tx: &Transaction<'_>) -> CmdResult<usize> {
    let removed = tx.execute(
        "delete from links where id in ( \
           select id from links order by created_at desc, rowid desc limit -1 offset ?1 \
         )",
        [HISTORY_LIMIT as i64],
    )?;
    Ok(removed)
}

pub fn history_remove(conn: &Connection, id: &str) -> CmdResult<()> {
    conn.execute("delete from links where id = ?1", [id])?;
    Ok(())
}

pub fn history_clear(conn: &Connection) -> CmdResult<()> {
    conn.execute("delete from links", [])?;
    Ok(())
}

/// Пакетная запись истории — одна транзакция на весь файл.
pub fn history_import(tx: &Transaction<'_>, rows: Vec<NewHistoryItem>) -> CmdResult<ImportResult> {
    let mut result = ImportResult::default();

    for row in rows {
        let label = row.url.trim().to_string();
        match history_add(tx, row) {
            Ok(_) => result.added += 1,
            Err(error) => result.skipped.push(format!("{label} — {}", error.message)),
        }
    }

    Ok(result)
}

/* ─────────────────────────── справочник ─────────────────────────── */

pub fn dictionary_list(conn: &Connection) -> CmdResult<Vec<DictEntry>> {
    let mut stmt = conn.prepare(
        "select kind, value, uses, canonical, first_seen_at, last_used_at \
         from dict_values order by uses desc, value asc",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(DictEntry {
            kind: row.get("kind")?,
            value: row.get("value")?,
            uses: row.get("uses")?,
            canonical: row.get("canonical")?,
            first_seen_at: row.get("first_seen_at")?,
            last_used_at: row.get("last_used_at")?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Учесть значения ссылки.
///
/// Инкремент атомарный (`on conflict do update`), а не «прочитать и записать»,
/// как в вебе: там на это есть оговорка про отсутствие гонок, здесь она просто
/// не нужна.
pub fn track_values(tx: &Transaction<'_>, params: &UtmParams) -> CmdResult<()> {
    let stamp = now();

    for kind in UTM_KEYS {
        let Some(value) = params.get(kind).map(|v| v.trim()).filter(|v| !v.is_empty()) else {
            continue;
        };

        tx.execute(
            "insert into dict_values (kind, value, uses, first_seen_at, last_used_at) \
             values (?1, ?2, 1, ?3, ?3) \
             on conflict(kind, value) do update set \
               uses = uses + 1, last_used_at = excluded.last_used_at",
            params![kind, value, stamp],
        )?;
    }

    Ok(())
}

/// Свести расщепление: алиас начинает указывать на канон.
///
/// Значение в истории не переписываем — там оно уже уехало в отчёты площадки,
/// и подмена задним числом соврала бы.
pub fn dictionary_merge(conn: &Connection, kind: &str, alias: &str, canonical: &str) -> CmdResult<()> {
    conn.execute(
        "update dict_values set canonical = ?3 where kind = ?1 and value = ?2",
        params![kind, alias, canonical],
    )?;
    Ok(())
}

pub fn dictionary_remove(conn: &Connection, kind: &str, value: &str) -> CmdResult<()> {
    conn.execute(
        "delete from dict_values where kind = ?1 and value = ?2",
        params![kind, value],
    )?;
    Ok(())
}

/* ─────────────────────────── настройки ─────────────────────────── */

/// Настройки интерфейса: тема, режим генератора, вид списков.
///
/// ⚠️ Дублируют `localStorage` вебвью намеренно. Профиль вебвью лежит рядом с
/// приложением и теряется при переустановке, смене идентификатора или чистке
/// кэша, а «тема слетела после обновления» читается как поломка. База это
/// переживает, и при старте значения возвращаются в `localStorage` — фронт
/// продолжает читать их синхронно, как читал.
pub fn settings_all(conn: &Connection) -> CmdResult<Vec<(String, String)>> {
    let mut stmt = conn.prepare("select key, value from settings")?;
    let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn settings_set(conn: &Connection, key: &str, value: &str) -> CmdResult<()> {
    conn.execute(
        "insert into settings (key, value) values (?1, ?2) \
         on conflict(key) do update set value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

/* ─────────────────────────── служебное ─────────────────────────── */

/// Отметки в таблице `meta`: например, «импорт из 2.2 уже предлагали».
pub fn meta_get(conn: &Connection, key: &str) -> CmdResult<Option<String>> {
    let mut stmt = conn.prepare("select value from meta where key = ?1")?;
    Ok(stmt.query_row([key], |row| row.get(0)).optional()?)
}

pub fn meta_set(conn: &Connection, key: &str, value: &str) -> CmdResult<()> {
    conn.execute(
        "insert into meta (key, value) values (?1, ?2) \
         on conflict(key) do update set value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate;

    fn db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        migrate(&mut conn).unwrap();
        conn
    }

    fn link(url: &str, source: &str) -> NewHistoryItem {
        let mut params = UtmParams::new();
        params.insert("source".into(), source.into());
        NewHistoryItem { url: url.into(), params, ..Default::default() }
    }

    #[test]
    fn saving_link_fills_dictionary() {
        // Главная неявность плана: справочник наполняется побочным эффектом
        // сохранения ссылки. Голый insert не упал бы — просто оставил пустоту.
        let mut conn = db();
        let tx = conn.transaction().unwrap();
        history_add(&tx, link("https://site.ru/a", "yandex")).unwrap();
        tx.commit().unwrap();

        let dict = dictionary_list(&conn).unwrap();
        assert_eq!(dict.len(), 1);
        assert_eq!(dict[0].value, "yandex");
        assert_eq!(dict[0].uses, 1);
    }

    #[test]
    fn repeated_value_increments_counter() {
        let mut conn = db();
        for _ in 0..3 {
            let tx = conn.transaction().unwrap();
            history_add(&tx, link("https://site.ru/a", "vk")).unwrap();
            tx.commit().unwrap();
        }

        let dict = dictionary_list(&conn).unwrap();
        assert_eq!(dict.len(), 1, "значение не задвоилось");
        assert_eq!(dict[0].uses, 3);
    }

    #[test]
    fn history_keeps_only_500_newest() {
        let mut conn = db();
        let tx = conn.transaction().unwrap();
        for index in 0..501 {
            let mut input = link(&format!("https://site.ru/{index}"), "vk");
            // Даты растут, чтобы порядок был однозначным.
            input.created_at = Some(format!("2026-08-13T10:{:02}:{:02}Z", index / 60, index % 60));
            history_add(&tx, input).unwrap();
        }
        tx.commit().unwrap();

        let count: i64 = conn.query_row("select count(*) from links", [], |r| r.get(0)).unwrap();
        assert_eq!(count, HISTORY_LIMIT as i64);

        let oldest_left: i64 = conn
            .query_row("select count(*) from links where url = 'https://site.ru/0'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(oldest_left, 0, "самая старая вытеснена");
    }

    #[test]
    fn duplicate_template_name_gives_domain_error() {
        let mut conn = db();

        let tx = conn.transaction().unwrap();
        templates_create(&tx, NewTemplate { name: "Осень".into(), ..Default::default() }).unwrap();
        tx.commit().unwrap();

        let tx = conn.transaction().unwrap();
        let clash = templates_create(&tx, NewTemplate { name: "ОСЕНЬ".into(), ..Default::default() });

        let error = clash.expect_err("имя занято");
        // Не строка движка «UNIQUE constraint failed», а текст для человека.
        assert_eq!(error.message, MESSAGE_NAME_TAKEN);
    }

    #[test]
    fn import_reports_skipped_by_name() {
        let mut conn = db();
        let tx = conn.transaction().unwrap();
        templates_create(&tx, NewTemplate { name: "Осень".into(), ..Default::default() }).unwrap();
        tx.commit().unwrap();

        let tx = conn.transaction().unwrap();
        let result = templates_import(
            &tx,
            vec![
                NewTemplate { name: "Осень".into(), ..Default::default() },
                NewTemplate { name: "Зима".into(), ..Default::default() },
            ],
        )
        .unwrap();
        tx.commit().unwrap();

        assert_eq!(result.added, 1);
        assert_eq!(result.skipped.len(), 1);
        assert!(result.skipped[0].starts_with("Осень — "), "пропуск назван поимённо");
    }

    #[test]
    fn template_update_changes_only_given_fields() {
        let mut conn = db();
        let tx = conn.transaction().unwrap();
        let created = templates_create(
            &tx,
            NewTemplate {
                name: "Осень".into(),
                base_url: Some("https://site.ru".into()),
                tag_name: Some("клиент".into()),
                ..Default::default()
            },
        )
        .unwrap();
        tx.commit().unwrap();

        let tx = conn.transaction().unwrap();
        let updated = templates_update(
            &tx,
            &created.id,
            TemplatePatch { name: Some("Осень 2026".into()), ..Default::default() },
        )
        .unwrap();
        tx.commit().unwrap();

        assert_eq!(updated.name, "Осень 2026");
        assert_eq!(updated.base_url.as_deref(), Some("https://site.ru"), "адрес не потерян");
        assert_eq!(updated.tag_name.as_deref(), Some("клиент"), "тег не потерян");
    }

    #[test]
    fn import_keeps_original_dates() {
        // Даты 2.2 приходят вместе со строкой: без этого вся перенесённая
        // история схлопнулась бы в сегодня.
        let mut conn = db();
        let tx = conn.transaction().unwrap();
        let mut input = link("https://site.ru/old", "vk");
        input.created_at = Some("2026-05-27T10:02:40Z".into());
        let saved = history_add(&tx, input).unwrap();
        tx.commit().unwrap();

        assert_eq!(saved.created_at.as_deref(), Some("2026-05-27T10:02:40Z"));
    }

    #[test]
    fn merge_marks_alias_without_touching_history() {
        let mut conn = db();
        let tx = conn.transaction().unwrap();
        history_add(&tx, link("https://site.ru/a", "Yandex")).unwrap();
        history_add(&tx, link("https://site.ru/b", "yandex")).unwrap();
        tx.commit().unwrap();

        dictionary_merge(&conn, "source", "Yandex", "yandex").unwrap();

        let dict = dictionary_list(&conn).unwrap();
        let alias = dict.iter().find(|entry| entry.value == "Yandex").unwrap();
        assert_eq!(alias.canonical.as_deref(), Some("yandex"));

        let history = history_list(&conn, None).unwrap();
        let original = history.iter().find(|item| item.url.ends_with("/a")).unwrap();
        assert_eq!(
            original.params.get("source").map(String::as_str),
            Some("Yandex"),
            "в истории значение остаётся тем, что реально ушло в площадку"
        );
    }

    #[test]
    fn empty_values_are_not_tracked() {
        let mut conn = db();
        let tx = conn.transaction().unwrap();
        let mut params = UtmParams::new();
        params.insert("source".into(), "   ".into());
        params.insert("medium".into(), String::new());
        history_add(
            &tx,
            NewHistoryItem { url: "https://site.ru".into(), params, ..Default::default() },
        )
        .unwrap();
        tx.commit().unwrap();

        assert!(dictionary_list(&conn).unwrap().is_empty());
    }
}
