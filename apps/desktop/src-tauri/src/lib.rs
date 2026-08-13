//! Оболочка десктопа UTMka.
//!
//! Здесь живёт всё, чего нет в вебвью: локальный SQLite, сетевые команды в
//! обход CORS и импорт базы версии 2.2. Правила остаются в `@utmka/core` и
//! вызываются из фронта — Rust отвечает за хранение и за то, до чего вебвью
//! не дотягивается.
//!
//! ⚠️ Заголовки безопасности задаёт `app.security.csp` в `tauri.conf.json`
//! (комментарии в самом файле недопустимы — схема отвергает лишние поля).
//! Это место `headers()` из `next.config.ts`: в десктопе её не существует, а
//! при статическом экспорте Next она молча игнорируется — приложение поехало
//! бы без CSP и никто бы не заметил. Хост Метрики из политики вычеркнут:
//! счётчика в окне нет. `connect-src` оставляет только свой источник и мост
//! IPC — наружу за вебвью ходит Rust, а не оно само.

mod commands;
mod db;
mod error;
mod import22;
mod models;
mod net;
mod store;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        /* Плагины ровно под три вещи, которых нет у вебвью: системный диалог
           сохранения, запись выбранного файла и буфер обмена. Никакого
           HTTP-плагина: наружу ходят команды `net_*` с предохранителями. */
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            /* Путь задаём явно от каталога данных пользователя: `app_data_dir()`
               берёт имя папки из идентификатора приложения и увёл бы базу в
               сторону от данных 2.2, которые лежат в `%APPDATA%\UTMka`. */
            let path = db::database_path(&commands::roaming_dir()?);
            log::info!("база: {}", path.display());

            let pool = db::open(&path).map_err(|error| {
                // Без базы приложение бессмысленно: лучше честно упасть на
                // старте, чем показывать пустые списки как норму.
                std::io::Error::other(error.message)
            })?;
            app.manage(pool);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::templates_list,
            commands::templates_create,
            commands::templates_update,
            commands::templates_remove,
            commands::templates_import,
            commands::history_list,
            commands::history_add,
            commands::history_remove,
            commands::history_clear,
            commands::history_import,
            commands::dictionary_list,
            commands::dictionary_track,
            commands::dictionary_merge,
            commands::dictionary_remove,
            commands::net_shorten,
            commands::net_hop,
            commands::import22_probe,
            commands::import22_run,
            commands::import22_dismiss,
        ])
        .run(tauri::generate_context!())
        .expect("окно Tauri не запустилось");
}
