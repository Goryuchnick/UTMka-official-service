//! Соединение с базой, схема и миграции.
//!
//! Схема получена из `apps/web/supabase/migrations/utmka_0001_init.sql`
//! вычитанием всего серверного: ни `users`, ни `llm_usage`, ни `rate_limits`,
//! ни колонки `user_hash`. Мультиарендность — забота оболочки, а в локальном
//! приложении пользователь один и он же владелец файла.

use std::fs;
use std::path::{Path, PathBuf};

use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;

use crate::error::CmdResult;

pub type Db = Pool<SqliteConnectionManager>;

/// Версия схемы. Растёт с каждой миграцией, хранится в `PRAGMA user_version`.
const SCHEMA_VERSION: i32 = 1;

/// Сколько ждать освобождения файла, прежде чем отдать «database is locked».
const BUSY_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(5);

const MIGRATION_0001: &str = r#"
create table templates (
  id         text primary key,
  name       text not null,
  -- Имя в нижнем регистре, посчитанное в Rust. См. индекс ниже.
  name_key   text not null,
  base_url   text not null default '',
  params     text not null default '{}',
  tag_name   text,
  tag_color  text,
  preset_id  text,
  created_at text not null,
  updated_at text not null
);
/* Уникальность имени — регистронезависимая, как в Postgres.
   ⚠️ Индекс по `lower(name)` здесь НЕ годится: встроенный `lower()` в SQLite
   работает только с латиницей, и «Осень» с «ОСЕНЬ» прошли бы как разные
   шаблоны — при том, что имена у пользователя русские, а веб такой дубль
   отклоняет. Ключ считаем в Rust, где регистр Unicode настоящий. */
create unique index templates_name_uniq on templates (name_key);
create index templates_updated_idx on templates (updated_at desc);

create table links (
  id         text primary key,
  url        text not null,
  base_url   text not null default '',
  params     text not null default '{}',
  short_url  text,
  tag_name   text,
  tag_color  text,
  origin     text not null check (origin in ('single','batch','brief','parse')),
  batch_id   text,
  created_at text not null
);
create index links_created_idx on links (created_at desc);

create table dict_values (
  kind          text not null check (kind in ('source','medium','campaign','content','term')),
  value         text not null,
  uses          integer not null default 1,
  canonical     text,
  first_seen_at text not null,
  last_used_at  text not null,
  primary key (kind, value)
) without rowid;
create index dict_kind_uses_idx on dict_values (kind, uses desc);

create table settings (key text primary key, value text not null);
create table meta     (key text primary key, value text not null);
"#;

/// Путь к файлу базы: `%APPDATA%\Roaming\UTMka\3.0\utmka.db` и аналоги.
///
/// ⚠️ Считается от каталога данных пользователя, а не от `app_data_dir()`:
/// тот берёт имя папки из идентификатора приложения (`ru.alexpronin.utmka`) и
/// увёл бы базу в сторону от данных 2.2. Здесь они лежат рядом — своя папка
/// версии внутри общей `UTMka`, — и видно, что это одно приложение двух
/// поколений, а не два разных.
///
/// ⚠️ Каталог создаём сами: на чистой машине его нет, и SQLite отвечает
/// невнятным `unable to open database file` (код 14) — по такому сообщению
/// причину не найти. Папка `3.0` отдельная: 2.2 остаётся установленной и
/// обязана продолжать работать со своим файлом.
pub fn database_path(roaming: &Path) -> PathBuf {
    roaming.join("UTMka").join("3.0").join("utmka.db")
}

/// Открыть пул и накатить миграции.
pub fn open(path: &Path) -> CmdResult<Db> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    /* Режим журнала и миграции — ОДИН раз и до пула.
       ⚠️ Переключение `journal_mode` требует эксклюзивной блокировки файла.
       Если делать это в `with_init`, четыре соединения пула поднимаются
       одновременно и дерутся за неё: приложение стартует с «database is
       locked» на пустой базе. */
    {
        let mut first = Connection::open(path)?;
        first.pragma_update(None, "journal_mode", "WAL")?;
        first.busy_timeout(BUSY_TIMEOUT)?;
        migrate(&mut first)?;
    }

    let manager = SqliteConnectionManager::file(path).with_init(|conn| {
        // Внешние ключи в SQLite по умолчанию выключены: без этого работают
        // только `check`-ограничения, а связи — нет.
        conn.pragma_update(None, "foreign_keys", "on")?;
        conn.busy_timeout(BUSY_TIMEOUT)?;
        Ok(())
    });

    Ok(Pool::builder().max_size(4).build(manager)?)
}

/// Линейные миграции по `PRAGMA user_version`.
///
/// Плагин `tauri-plugin-sql` даёт то же самое из коробки, но тянет за собой
/// вторую редакцию `libsqlite3-sys` — это тридцать строк против конфликта на
/// линковке (ARCHITECTURE §11).
pub fn migrate(conn: &mut Connection) -> CmdResult<()> {
    let version: i32 =
        conn.query_row("select * from pragma_user_version", [], |row| row.get(0))?;

    if version >= SCHEMA_VERSION {
        return Ok(());
    }

    let tx = conn.transaction()?;
    if version < 1 {
        tx.execute_batch(MIGRATION_0001)?;
    }
    // Следующая миграция допишется здесь же: `if version < 2 { … }`.
    tx.pragma_update(None, "user_version", SCHEMA_VERSION)?;
    tx.commit()?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn memory() -> Connection {
        Connection::open_in_memory().expect("память доступна")
    }

    #[test]
    fn migrate_on_empty_database_creates_schema() {
        let mut conn = memory();
        migrate(&mut conn).expect("миграция проходит");

        let version: i32 = conn
            .query_row("select * from pragma_user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, SCHEMA_VERSION);

        let tables: i64 = conn
            .query_row(
                "select count(*) from sqlite_master where type = 'table' and name in \
                 ('templates','links','dict_values','settings','meta')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(tables, 5, "заведены все пять таблиц");
    }

    #[test]
    fn migrate_is_idempotent() {
        // Второй запуск на уже накатанной базе не должен пытаться создать
        // таблицы заново — иначе первое же обновление приложения падает.
        let mut conn = memory();
        migrate(&mut conn).expect("первая миграция");
        migrate(&mut conn).expect("повторная миграция не падает");
    }

    #[test]
    fn template_name_key_is_unique() {
        let mut conn = memory();
        migrate(&mut conn).unwrap();

        conn.execute(
            "insert into templates (id, name, name_key, created_at, updated_at) \
             values ('1','Осень','осень','t','t')",
            [],
        )
        .unwrap();

        let clash = conn.execute(
            "insert into templates (id, name, name_key, created_at, updated_at) \
             values ('2','ОСЕНЬ','осень','t','t')",
            [],
        );
        assert!(clash.is_err(), "разный регистр — то же имя");
    }

    #[test]
    fn sqlite_lower_does_not_handle_cyrillic() {
        /* Причина, по которой ключ считается в Rust, а не индексом по
           `lower(name)`: встроенный `lower()` не трогает кириллицу. Тест держит
           это знание в репозитории — иначе при следующей правке схемы индекс
           «упростят» обратно и дубли русских имён пройдут молча. */
        let conn = memory();
        let lowered: String = conn
            .query_row("select lower('ОСЕНЬ')", [], |row| row.get(0))
            .unwrap();
        assert_eq!(lowered, "ОСЕНЬ", "SQLite не понижает регистр кириллицы");
    }

    #[test]
    fn link_origin_is_restricted() {
        let mut conn = memory();
        migrate(&mut conn).unwrap();

        let bad = conn.execute(
            "insert into links (id, url, origin, created_at) values ('1','https://a','неизвестно','t')",
            [],
        );
        assert!(bad.is_err(), "чужое значение origin не проходит");
    }
}
