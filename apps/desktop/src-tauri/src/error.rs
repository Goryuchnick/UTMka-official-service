//! Доменная ошибка команд.
//!
//! На фронт уходит структурой `{ kind, message }`, а не строкой: в TypeScript
//! из неё собирается `BackendError` того же вида, что и в вебе, и экраны
//! разбирают отказ одинаково в обеих оболочках. Пересобирать доменный тип из
//! текста сообщения — значит завести второй источник правды.

use serde::Serialize;

/// Виды отказа. Ровно те же, что в `BackendErrorKind` ядра.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    /// Нужна кодовая фраза. В десктопе не встречается никогда — входа нет.
    Auth,
    /// Упёрлись в потолок хранения.
    Limit,
    /// Имя шаблона занято.
    Conflict,
    /// Сеть не ответила.
    Offline,
    /// Отказ по делу: негодный адрес, битые данные, сбой хранилища.
    Rejected,
}

#[derive(Debug, Clone, Serialize)]
pub struct CmdError {
    pub kind: Kind,
    pub message: String,
}

impl CmdError {
    pub fn new(kind: Kind, message: impl Into<String>) -> Self {
        Self { kind, message: message.into() }
    }

    pub fn rejected(message: impl Into<String>) -> Self {
        Self::new(Kind::Rejected, message)
    }

    pub fn conflict(message: impl Into<String>) -> Self {
        Self::new(Kind::Conflict, message)
    }

    pub fn limit(message: impl Into<String>) -> Self {
        Self::new(Kind::Limit, message)
    }

    pub fn offline(message: impl Into<String>) -> Self {
        Self::new(Kind::Offline, message)
    }
}

impl std::fmt::Display for CmdError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for CmdError {}

/// Расширенный код SQLite для нарушения уникального индекса.
///
/// ⚠️ В Postgres это `23505`, и веб ловит именно его. При переносе «по смыслу»
/// текст «Шаблон с таким названием уже есть» потерялся бы, а пользователь
/// увидел бы `UNIQUE constraint failed: templates.name` — строку из движка.
const SQLITE_CONSTRAINT_UNIQUE: i32 = 2067;
const SQLITE_CONSTRAINT_PRIMARYKEY: i32 = 1555;

impl From<rusqlite::Error> for CmdError {
    fn from(error: rusqlite::Error) -> Self {
        if let rusqlite::Error::SqliteFailure(inner, _) = &error {
            if inner.extended_code == SQLITE_CONSTRAINT_UNIQUE
                || inner.extended_code == SQLITE_CONSTRAINT_PRIMARYKEY
            {
                return Self::conflict(crate::models::MESSAGE_NAME_TAKEN);
            }
        }
        Self::rejected(format!("Хранилище не ответило: {error}"))
    }
}

impl From<r2d2::Error> for CmdError {
    fn from(error: r2d2::Error) -> Self {
        Self::rejected(format!("Не удалось открыть базу: {error}"))
    }
}

impl From<tauri::Error> for CmdError {
    fn from(error: tauri::Error) -> Self {
        Self::rejected(format!("Сбой оболочки: {error}"))
    }
}

impl From<std::io::Error> for CmdError {
    fn from(error: std::io::Error) -> Self {
        Self::rejected(format!("Файловая система не ответила: {error}"))
    }
}

pub type CmdResult<T> = Result<T, CmdError>;
