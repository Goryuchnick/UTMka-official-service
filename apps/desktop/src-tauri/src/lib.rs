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

/// Скрипт, который кладёт сохранённые настройки обратно в `localStorage`.
///
/// Пишем только то, чего в хранилище ещё нет: профиль вебвью — источник
/// правды, пока он жив, а база — запасная копия на случай переустановки.
/// Тему ставим тут же атрибутом: бутстрап в `<head>` выполнится следом и
/// увидит уже заполненное хранилище.
fn restore_script(saved: &[(String, String)]) -> String {
    let pairs = saved
        .iter()
        .map(|(key, value)| {
            format!(
                "[{},{}]",
                serde_json::to_string(key).unwrap_or_else(|_| "\"\"".into()),
                serde_json::to_string(value).unwrap_or_else(|_| "\"\"".into()),
            )
        })
        .collect::<Vec<_>>()
        .join(",");

    format!(
        "(function(){{try{{var s=[{pairs}];for(var i=0;i<s.length;i++){{\
         if(localStorage.getItem(s[i][0])===null)localStorage.setItem(s[i][0],s[i][1]);}}\
         var t=localStorage.getItem('utmka.theme');\
         if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;\
         }}catch(e){{}}}})()"
    )
}

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

            /* Настройки возвращаем в `localStorage` ДО первого скрипта страницы.
               Фронт читает тему синхронно (иначе она мигает тёмной на светлой),
               а профиль вебвью не вечен: переустановка или чистка кэша сбрасывали
               и тему, и режим генератора. Копия в базе это переживает.

               ⚠️ Раньше это делал `eval` по уже созданному окну — и опаздывал.
               Замер в живом окне: на бутстрапе темы в `<head>` ключей ещё нет,
               они появляются только к `main.tsx`. То есть ровно тот скрипт,
               который написан против мигания темы, читал пустое хранилище.
               `initialization_script` выполняется до разбора документа и до
               любого его скрипта, поэтому окно создаётся здесь, а не само по
               конфигу (`"create": false` в `tauri.conf.json`; остальные его
               поля — размеры, отсутствие декораций, заголовок — по-прежнему
               читаются оттуда через `from_config`). */
            let boot = pool
                .get()
                .ok()
                .and_then(|conn| store::settings_all(&conn).ok())
                .filter(|saved| !saved.is_empty())
                .map(|saved| restore_script(&saved));

            app.manage(pool);

            let config = app
                .config()
                .app
                .windows
                .first()
                .cloned()
                .ok_or_else(|| std::io::Error::other("в tauri.conf.json не описано окно"))?;

            let mut window = tauri::WebviewWindowBuilder::from_config(app.handle(), &config)?;
            if let Some(script) = boot {
                window = window.initialization_script(script);
            }
            window.build()?;

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
            commands::settings_set,
        ])
        .run(tauri::generate_context!())
        .expect("окно Tauri не запустилось");
}
