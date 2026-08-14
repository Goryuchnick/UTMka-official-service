//! Команды, видимые вебвью.
//!
//! Список закрытый и крошечный — 13 методов контракта плюс служебные. Именно
//! поэтому взят `rusqlite`, а не `tauri-plugin-sql`: тот отдал бы в окно
//! произвольный `select`/`execute`, а правила уехали бы в TypeScript рядом с
//! разметкой и разошлись с серверными.
//!
//! ⚠️ Синхронные команды Tauri исполняются в главном потоке — списком на 500
//! строк и импортом файла можно подморозить окно. Всё, что трогает диск, идёт
//! через `spawn_blocking`.

use tauri::State;

use std::path::PathBuf;

use crate::db::Db;
use crate::error::{CmdError, CmdResult};
use crate::import22;
use crate::models::*;
use crate::net;
use crate::store;

/// Выполнить работу с базой вне главного потока.
async fn blocking<T, F>(db: &Db, work: F) -> CmdResult<T>
where
    T: Send + 'static,
    F: FnOnce(&mut rusqlite::Connection) -> CmdResult<T> + Send + 'static,
{
    let pool = db.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut conn = pool.get()?;
        work(&mut conn)
    })
    .await
    .map_err(|error| CmdError::rejected(format!("Задача не выполнилась: {error}")))?
}

/* ─────────────────────────── шаблоны ─────────────────────────── */

#[tauri::command]
pub async fn templates_list(db: State<'_, Db>) -> CmdResult<Vec<Template>> {
    blocking(&db, |conn| store::templates_list(conn)).await
}

#[tauri::command]
pub async fn templates_create(db: State<'_, Db>, input: NewTemplate) -> CmdResult<Template> {
    blocking(&db, move |conn| {
        let tx = conn.transaction()?;
        let created = store::templates_create(&tx, input)?;
        tx.commit()?;
        Ok(created)
    })
    .await
}

#[tauri::command]
pub async fn templates_update(
    db: State<'_, Db>,
    id: String,
    patch: TemplatePatch,
) -> CmdResult<Template> {
    blocking(&db, move |conn| {
        let tx = conn.transaction()?;
        let updated = store::templates_update(&tx, &id, patch)?;
        tx.commit()?;
        Ok(updated)
    })
    .await
}

#[tauri::command]
pub async fn templates_remove(db: State<'_, Db>, id: String) -> CmdResult<()> {
    blocking(&db, move |conn| store::templates_remove(conn, &id)).await
}

#[tauri::command]
pub async fn templates_import(db: State<'_, Db>, rows: Vec<NewTemplate>) -> CmdResult<ImportResult> {
    blocking(&db, move |conn| {
        // Одна транзакция на весь файл, а не 500 отдельных вызовов через IPC.
        let tx = conn.transaction()?;
        let result = store::templates_import(&tx, rows)?;
        tx.commit()?;
        Ok(result)
    })
    .await
}

/* ─────────────────────────── история ─────────────────────────── */

#[tauri::command]
pub async fn history_list(db: State<'_, Db>, limit: Option<usize>) -> CmdResult<Vec<HistoryItem>> {
    blocking(&db, move |conn| store::history_list(conn, limit)).await
}

#[tauri::command]
pub async fn history_add(db: State<'_, Db>, input: NewHistoryItem) -> CmdResult<HistoryItem> {
    blocking(&db, move |conn| {
        // Вставка, вытеснение лишнего и наполнение справочника — одной
        // транзакцией: в вебе это три отдельных запроса подряд.
        let tx = conn.transaction()?;
        let item = store::history_add(&tx, input)?;
        tx.commit()?;
        Ok(item)
    })
    .await
}

#[tauri::command]
pub async fn history_remove(db: State<'_, Db>, id: String) -> CmdResult<()> {
    blocking(&db, move |conn| store::history_remove(conn, &id)).await
}

#[tauri::command]
pub async fn history_clear(db: State<'_, Db>) -> CmdResult<()> {
    blocking(&db, |conn| store::history_clear(conn)).await
}

#[tauri::command]
pub async fn history_import(
    db: State<'_, Db>,
    rows: Vec<NewHistoryItem>,
) -> CmdResult<ImportResult> {
    blocking(&db, move |conn| {
        let tx = conn.transaction()?;
        let result = store::history_import(&tx, rows)?;
        tx.commit()?;
        Ok(result)
    })
    .await
}

/* ─────────────────────────── справочник ─────────────────────────── */

#[tauri::command]
pub async fn dictionary_list(db: State<'_, Db>) -> CmdResult<Vec<DictEntry>> {
    blocking(&db, |conn| store::dictionary_list(conn)).await
}

/// Учесть значения вручную.
///
/// Обычно справочник наполняет `history_add` побочным эффектом сохранения
/// ссылки, и это главный путь. Но канон полезно завести заранее — до первой
/// ссылки, — поэтому та же функция доступна отдельной командой. Путь один и
/// тот же (`track_values`), иначе счётчики разошлись бы с обычной записью.
#[tauri::command]
pub async fn dictionary_track(db: State<'_, Db>, params: UtmParams) -> CmdResult<()> {
    blocking(&db, move |conn| {
        let tx = conn.transaction()?;
        store::track_values(&tx, &params)?;
        tx.commit()?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn dictionary_merge(
    db: State<'_, Db>,
    kind: String,
    alias: String,
    canonical: String,
) -> CmdResult<()> {
    blocking(&db, move |conn| store::dictionary_merge(conn, &kind, &alias, &canonical)).await
}

#[tauri::command]
pub async fn dictionary_remove(db: State<'_, Db>, kind: String, value: String) -> CmdResult<()> {
    blocking(&db, move |conn| store::dictionary_remove(conn, &kind, &value)).await
}

/* ─────────────────────────── сеть ─────────────────────────── */

/// Сокращение через clck.ru: у сервиса нет CORS, из вебвью его не позвать.
#[tauri::command]
pub async fn net_shorten(url: String) -> CmdResult<String> {
    net::shorten(&url).await
}

/// Один хоп цепочки переадресаций.
///
/// Именно хоп, а не вся цепочка: логику ведёт ядро (`followRedirects`), вызывая
/// эту команду на каждом шаге. Так сравнение меток, потолок хопов и тексты
/// объяснений не пишутся второй раз на Rust и не расходятся с вебом.
#[tauri::command]
pub async fn net_hop(url: String) -> CmdResult<net::HopResponse> {
    net::hop(&url).await
}

/* ─────────────────────────── настройки ─────────────────────────── */

/// Сохранить настройку интерфейса (тема, режим, вид списка).
///
/// Фронт по-прежнему читает их из `localStorage` синхронно — иначе тема
/// мигала бы при каждом старте. База нужна как надёжная копия: профиль вебвью
/// теряется при переустановке, а настройки — нет.
#[tauri::command]
pub async fn settings_set(db: State<'_, Db>, key: String, value: String) -> CmdResult<()> {
    blocking(&db, move |conn| store::settings_set(conn, &key, &value)).await
}

/* ─────────────────────────── импорт из 2.2 ─────────────────────────── */

/// Каталог `%APPDATA%\Roaming` (и аналоги), где 2.2 держит свои данные.
///
/// От него же считается путь к базе 3.0 — чтобы оба поколения лежали рядом.
pub fn roaming_dir() -> CmdResult<PathBuf> {
    #[cfg(windows)]
    {
        std::env::var_os("APPDATA")
            .map(PathBuf::from)
            .ok_or_else(|| CmdError::rejected("Не найден каталог данных пользователя"))
    }
    #[cfg(not(windows))]
    {
        std::env::var_os("HOME")
            .map(|home| PathBuf::from(home).join(".local").join("share"))
            .ok_or_else(|| CmdError::rejected("Не найден каталог данных пользователя"))
    }
}

/// Есть ли что переносить из 2.2 — числа для диалога первого запуска.
#[tauri::command]
pub async fn import22_probe(db: State<'_, Db>) -> CmdResult<import22::Probe> {
    let roaming = roaming_dir()?;
    blocking(&db, move |conn| {
        let done = import22::is_done(conn);
        Ok(import22::probe(&roaming, done))
    })
    .await
}

/// Перенести данные 2.2. Файл 2.2 открывается только на чтение и не меняется.
#[tauri::command]
pub async fn import22_run(db: State<'_, Db>, path: String) -> CmdResult<import22::ImportReport> {
    blocking(&db, move |conn| import22::run(conn, std::path::Path::new(&path))).await
}

/// Отметить, что предложение больше показывать не нужно («перенесу потом»).
#[tauri::command]
pub async fn import22_dismiss(db: State<'_, Db>) -> CmdResult<()> {
    blocking(&db, |conn| store::meta_set(conn, import22::META_IMPORTED, "dismissed")).await
}

/* ─────────────────────────── обмен с веб-аккаунтом ─────────────────────────── */

/// Состояние синхронизации для интерфейса.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    /// Есть ли живая сессия. Фразу при этом не храним — только куку.
    pub linked: bool,
    /// Когда обменивались последний раз, ISO. `None` — ещё ни разу.
    pub last_at: Option<String>,
}

fn session_of(conn: &rusqlite::Connection) -> CmdResult<Option<String>> {
    store::meta_get(conn, crate::sync::SESSION_META_KEY)
}

#[tauri::command]
pub async fn sync_state(db: State<'_, Db>) -> CmdResult<SyncState> {
    blocking(&db, |conn| {
        Ok(SyncState {
            linked: session_of(conn)?.is_some(),
            last_at: store::meta_get(conn, "sync.last_at")?,
        })
    })
    .await
}

/// Вход по фразе. На диск ложится сессия, сама фраза не сохраняется нигде.
#[tauri::command]
pub async fn sync_link(db: State<'_, Db>, passphrase: String) -> CmdResult<SyncState> {
    let session = crate::sync::login(passphrase.trim()).await?;

    blocking(&db, move |conn| {
        store::meta_set(conn, crate::sync::SESSION_META_KEY, &session)?;
        Ok(SyncState { linked: true, last_at: store::meta_get(conn, "sync.last_at")? })
    })
    .await
}

#[tauri::command]
pub async fn sync_unlink(db: State<'_, Db>) -> CmdResult<SyncState> {
    let session = blocking(&db, |conn| session_of(conn)).await?;
    if let Some(session) = session {
        crate::sync::logout(&session).await?;
    }

    blocking(&db, |conn| {
        store::meta_remove(conn, crate::sync::SESSION_META_KEY)?;
        Ok(SyncState { linked: false, last_at: store::meta_get(conn, "sync.last_at")? })
    })
    .await
}

/// Забрать снимок аккаунта. План слияния по нему считает ядро на фронте.
#[tauri::command]
pub async fn sync_pull(db: State<'_, Db>) -> CmdResult<crate::sync::RemoteState> {
    let session = blocking(&db, |conn| session_of(conn))
        .await?
        .ok_or_else(|| CmdError::auth("Сначала введите кодовую фразу"))?;

    crate::sync::pull(&session).await
}

/// Отправить недостающее в аккаунт и отметить время обмена.
#[tauri::command]
pub async fn sync_push(
    db: State<'_, Db>,
    templates: Vec<serde_json::Value>,
    links: Vec<serde_json::Value>,
) -> CmdResult<crate::sync::PushResult> {
    let session = blocking(&db, |conn| session_of(conn))
        .await?
        .ok_or_else(|| CmdError::auth("Сначала введите кодовую фразу"))?;

    let result = crate::sync::push(&session, templates, links).await?;

    let now = store::now();
    blocking(&db, move |conn| store::meta_set(conn, "sync.last_at", &now)).await?;

    Ok(result)
}
