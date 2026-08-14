//! Импорт данных из десктопа 2.2.
//!
//! ⚠️ Читаем **саму базу**, а не штатный экспорт: `export_history` и
//! `export_templates` в 2.2 (`history.py:111`, `templates.py:126`) выбрасывают
//! `id`, `user_email` и `created_at` — вся история схлопнулась бы в сегодня.
//!
//! ⚠️ Файл 2.2 открывается только на чтение и не удаляется: версия 2.2.1
//! остаётся установленной и обязана продолжать работать со своими данными.

use std::path::{Path, PathBuf};

use rusqlite::{Connection, OpenFlags};
use serde::Serialize;

use crate::error::{CmdError, CmdResult};
use crate::models::{ImportResult, NewHistoryItem, NewTemplate, UtmParams};
use crate::store;

/// Ключ отметки в `meta`: импорт уже предлагали и он состоялся.
pub const META_IMPORTED: &str = "import.v22";

/// Что нашли в базе 2.2 — числа для диалога первого запуска.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Probe {
    /// Путь к найденному файлу. `None` — переносить нечего.
    pub path: Option<String>,
    pub links: usize,
    pub templates: usize,
    /// Импорт уже выполняли — второй раз не предлагаем.
    pub done: bool,
}

/// Итог переноса. Пропущенные строки перечисляются поимённо.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport {
    pub links: ImportResult,
    pub templates: ImportResult,
}

/// Где искать базу 2.2.
///
/// Кандидатов три, и порядок важен: рабочая база 2.2.1 лежит в `databases/`,
/// а `utm_data.db` рядом — файл более старой сборки, где нет части колонок.
pub fn candidates(roaming: &Path) -> Vec<PathBuf> {
    vec![
        roaming.join("UTMka").join("databases").join("utmka.db"),
        roaming.join("UTMka").join("utm_data.db"),
    ]
}

fn open_readonly(path: &Path) -> CmdResult<Connection> {
    Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| CmdError::rejected(format!("База 2.2 не открылась: {error}")))
}

/// Есть ли колонка. Набор полей у разных сборок 2.2 отличается.
///
/// Проверяем через `PRAGMA table_info`, а не по модели: в `utm_data.db` более
/// старой сборки у `history_new` нет `short_url`, `tag_name` и `tag_color`,
/// и запрос с ними просто упал бы.
fn columns(conn: &Connection, table: &str) -> CmdResult<Vec<String>> {
    let mut stmt = conn.prepare(&format!("select name from pragma_table_info('{table}')"))?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

fn count(conn: &Connection, table: &str) -> usize {
    conn.query_row(&format!("select count(*) from {table}"), [], |row| {
        row.get::<_, i64>(0)
    })
    .map(|value| value as usize)
    .unwrap_or(0)
}

/// Посмотреть, есть ли что переносить.
pub fn probe(roaming: &Path, already_done: bool) -> Probe {
    for path in candidates(roaming) {
        if !path.exists() {
            continue;
        }
        let Ok(conn) = open_readonly(&path) else { continue };

        let links = count(&conn, "history_new");
        let templates = count(&conn, "templates");
        if links == 0 && templates == 0 {
            // Пустая база более старой сборки — предлагать нечего.
            continue;
        }

        return Probe {
            path: Some(path.display().to_string()),
            links,
            templates,
            done: already_done,
        };
    }

    Probe { path: None, links: 0, templates: 0, done: already_done }
}

/// Нормализация даты 2.2.
///
/// ⚠️ 2.2 писала `datetime.utcnow()` без таймзоны: `2026-05-27 10:02:40.476694`.
/// `new Date` в интерфейсе прочитает такую строку как **локальное** время — у
/// владельца UTC+4 вся история уехала бы на четыре часа назад, и порядок
/// записей в списке перестал бы совпадать с тем, что показывает запущенная
/// рядом 2.2.
fn normalize_stamp(raw: Option<String>) -> Option<String> {
    let raw = raw?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.ends_with('Z') || trimmed.contains('+') {
        return Some(trimmed.to_string());
    }
    Some(format!("{}Z", trimmed.replacen(' ', "T", 1)))
}

fn params_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<UtmParams> {
    let mut params = UtmParams::new();
    for (column, key) in [
        ("utm_source", "source"),
        ("utm_medium", "medium"),
        ("utm_campaign", "campaign"),
        ("utm_content", "content"),
        ("utm_term", "term"),
    ] {
        // Пустые строки и NULL пропускаем: иначе в модель попадут пустые ключи,
        // а из них — пустые записи справочника.
        let value: Option<String> = row.get(column)?;
        if let Some(value) = value.map(|v| v.trim().to_string()).filter(|v| !v.is_empty()) {
            params.insert(key.to_string(), value);
        }
    }
    Ok(params)
}

/// Прочитать историю 2.2.
fn read_links(conn: &Connection) -> CmdResult<Vec<NewHistoryItem>> {
    let available = columns(conn, "history_new")?;
    let has = |name: &str| available.iter().any(|column| column == name);
    if !has("full_url") {
        return Ok(Vec::new());
    }

    let optional = |name: &str| if has(name) { name.to_string() } else { format!("null as {name}") };
    let sql = format!(
        "select full_url, base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, \
         {}, {}, {}, created_at from history_new order by created_at asc",
        optional("short_url"),
        optional("tag_name"),
        optional("tag_color"),
    );

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |row| {
        let url: String = row.get("full_url")?;
        let base_url: Option<String> = row.get("base_url").ok();
        Ok(NewHistoryItem {
            /* Адрес берём КАК ЕСТЬ и не пересобираем через `build`: в 2.2
               `full_url` хранится закодированным, а колонки `utm_*` — нет.
               Пересборка задним числом сделала бы исторические ссылки не теми,
               что реально ушли в площадку, а плейсхолдеры вроде `{campaign_id}`
               перестали бы быть буквальными. */
            url,
            base_url: base_url.unwrap_or_default(),
            params: params_from_row(row)?,
            short_url: row.get("short_url").ok().flatten(),
            tag_name: row.get("tag_name").ok().flatten(),
            tag_color: row.get("tag_color").ok().flatten(),
            // Соответствия «откуда ссылка» в 2.2 нет — всё считаем генератором.
            origin: Some("single".to_string()),
            batch_id: None,
            created_at: normalize_stamp(row.get("created_at").ok().flatten()),
        })
    })?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Прочитать шаблоны 2.2.
fn read_templates(conn: &Connection) -> CmdResult<Vec<NewTemplate>> {
    let available = columns(conn, "templates")?;
    if !available.iter().any(|column| column == "name") {
        return Ok(Vec::new());
    }

    let mut stmt = conn.prepare(
        "select name, utm_source, utm_medium, utm_campaign, utm_content, utm_term, \
         tag_name, tag_color from templates order by id asc",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(NewTemplate {
            name: row.get::<_, String>("name")?,
            // Базового адреса у шаблона в 2.2 не было.
            base_url: Some(String::new()),
            params: params_from_row(row)?,
            tag_name: row.get("tag_name").ok().flatten(),
            tag_color: row.get("tag_color").ok().flatten(),
            preset_id: None,
        })
    })?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Перенести данные. Файл 2.2 остаётся нетронутым.
pub fn run(target: &mut Connection, source_path: &Path) -> CmdResult<ImportReport> {
    let source = open_readonly(source_path)?;
    let links = read_links(&source)?;
    let templates = read_templates(&source)?;

    let tx = target.transaction()?;
    /* Справочник засеваем тем же путём, что и обычное сохранение: `history_add`
       внутри вызывает `track_values`. Отдельного «засева» нет — иначе он
       разошёлся бы с обычной записью. */
    let links_result = store::history_import(&tx, links)?;
    let templates_result = store::templates_import(&tx, templates)?;
    store::meta_set(&tx, META_IMPORTED, &store::now())?;
    tx.commit()?;

    Ok(ImportReport { links: links_result, templates: templates_result })
}

/// Импорт уже выполняли?
pub fn is_done(conn: &Connection) -> bool {
    store::meta_get(conn, META_IMPORTED).ok().flatten().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate;

    /// Сборка базы 2.2 — с тем же набором колонок, что у живой.
    ///
    /// Файлом, а не в памяти: `run` открывает источник по пути, как в жизни.
    fn legacy_at(path: &Path, with_tags: bool) -> Connection {
        let conn = Connection::open(path).unwrap();
        let tags = if with_tags {
            ", short_url text, tag_name text, tag_color text"
        } else {
            ""
        };
        conn.execute_batch(&format!(
            "create table history_new (
               id integer primary key, user_email text, base_url text, full_url text,
               utm_source text, utm_medium text, utm_campaign text, utm_content text,
               utm_term text, created_at text{tags}
             );
             create table templates (
               id integer primary key, user_email text, name text,
               utm_source text, utm_medium text, utm_campaign text, utm_content text,
               utm_term text, tag_name text, tag_color text, created_at text
             );"
        ))
        .unwrap();
        conn
    }

    #[test]
    fn naive_utc_becomes_iso_with_zone() {
        // Настоящая строка из базы владельца.
        assert_eq!(
            normalize_stamp(Some("2026-05-27 10:02:40.476694".into())),
            Some("2026-05-27T10:02:40.476694Z".into())
        );
    }

    #[test]
    fn already_normalized_stamp_is_left_alone() {
        assert_eq!(
            normalize_stamp(Some("2026-05-27T10:02:40Z".into())),
            Some("2026-05-27T10:02:40Z".into())
        );
        assert_eq!(normalize_stamp(Some("   ".into())), None);
        assert_eq!(normalize_stamp(None), None);
    }

    #[test]
    fn reads_old_build_without_tag_columns() {
        /* В `utm_data.db` более старой сборки у `history_new` нет `short_url`,
           `tag_name` и `tag_color`. Запрос с ними упал бы — значит набор
           колонок проверяем, а не берём из модели. */
        let dir = tempfile::tempdir().unwrap();
        let source = legacy_at(&dir.path().join("utm_data.db"), false);
        source
            .execute(
                "insert into history_new (full_url, utm_source, created_at) \
                 values ('https://site.ru/?utm_source=vk', 'vk', '2026-01-01 10:00:00')",
                [],
            )
            .unwrap();

        let links = read_links(&source).expect("старая схема читается");
        assert_eq!(links.len(), 1);
        assert!(links[0].short_url.is_none());
    }

    #[test]
    fn url_is_taken_as_is_with_placeholders() {
        let dir = tempfile::tempdir().unwrap();
        let source = legacy_at(&dir.path().join("utm_data.db"), true);
        source
            .execute(
                "insert into history_new (full_url, utm_source, utm_term, created_at) \
                 values ('https://site.ru/?utm_source=ya&utm_term=%7Bkeyword%7D', 'ya', 'free, -30%', '2026-01-01 10:00:00')",
                [],
            )
            .unwrap();

        let links = read_links(&source).unwrap();
        // Адрес — байт в байт из базы: закодированный, с плейсхолдером.
        assert_eq!(links[0].url, "https://site.ru/?utm_source=ya&utm_term=%7Bkeyword%7D");
        // А значения меток — из колонок, где они лежат раскодированными.
        assert_eq!(links[0].params.get("term").map(String::as_str), Some("free, -30%"));
    }

    #[test]
    fn empty_utm_columns_do_not_become_empty_keys() {
        let dir = tempfile::tempdir().unwrap();
        let source = legacy_at(&dir.path().join("utm_data.db"), true);
        source
            .execute(
                "insert into history_new (full_url, utm_source, utm_medium, created_at) \
                 values ('https://site.ru/', 'vk', '', '2026-01-01 10:00:00')",
                [],
            )
            .unwrap();

        let links = read_links(&source).unwrap();
        assert_eq!(links[0].params.len(), 1, "пустой medium не попал в модель");
    }

    #[test]
    fn import_seeds_dictionary_and_keeps_dates() {
        let dir = tempfile::tempdir().unwrap();
        let source = legacy_at(&dir.path().join("utm_data.db"), true);
        source
            .execute(
                "insert into history_new (full_url, utm_source, created_at) \
                 values ('https://site.ru/a', 'yandex', '2026-05-27 10:02:40')",
                [],
            )
            .unwrap();
        source
            .execute(
                "insert into templates (name, utm_source, created_at) \
                 values ('Осень', 'yandex', '2026-03-18 12:53:13')",
                [],
            )
            .unwrap();

        let legacy_path = dir.path().join("utm_data.db");
        drop(source); // источник открывается заново, уже только на чтение

        let mut target = Connection::open_in_memory().unwrap();
        migrate(&mut target).unwrap();

        let report = run(&mut target, &legacy_path).unwrap();
        assert_eq!(report.links.added, 1);
        assert_eq!(report.templates.added, 1);

        let history = store::history_list(&target, None).unwrap();
        assert_eq!(history[0].created_at.as_deref(), Some("2026-05-27T10:02:40Z"));

        // Справочник непустой сразу после переезда — иначе экран значений
        // встретил бы владельца пустотой.
        let dict = store::dictionary_list(&target).unwrap();
        assert!(dict.iter().any(|entry| entry.value == "yandex"));

        assert!(is_done(&target), "отметка проставлена — второй раз не предложим");
    }

    #[test]
    fn conflicting_template_names_are_listed_by_name() {
        let dir = tempfile::tempdir().unwrap();
        let source = legacy_at(&dir.path().join("utm_data.db"), true);
        source
            .execute("insert into templates (name, created_at) values ('дзен', '2026-01-01 10:00:00')", [])
            .unwrap();
        source
            .execute("insert into templates (name, created_at) values ('ДЗЕН', '2026-01-01 10:00:00')", [])
            .unwrap();

        let legacy_path = dir.path().join("utm_data.db");
        drop(source);

        let mut target = Connection::open_in_memory().unwrap();
        migrate(&mut target).unwrap();

        let report = run(&mut target, &legacy_path).unwrap();
        assert_eq!(report.templates.added, 1);
        assert_eq!(report.templates.skipped.len(), 1);
        // Поимённо, а не «загружено 1 из 2».
        assert!(report.templates.skipped[0].starts_with("ДЗЕН — "));
    }
}
