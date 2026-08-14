//! Модели хранилища.
//!
//! Ложатся на `Template`, `HistoryItem` и `DictEntry` из `@utmka/core` без
//! ручного маппинга: `rename_all = "camelCase"` переводит имена полей, а формы
//! совпадают один в один. Расхождение здесь означало бы, что экраны в десктопе
//! получают не то, что в вебе, — то есть форк моделей.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Потолки хранения — те же числа, что в `HISTORY_LIMIT`/`TEMPLATES_LIMIT` ядра.
pub const HISTORY_LIMIT: usize = 500;
pub const TEMPLATES_LIMIT: usize = 500;

/// Тексты отказов. Формулировки живут рядом с правилом, как в ядре.
pub const MESSAGE_NAME_TAKEN: &str = "Шаблон с таким названием уже есть";
pub const MESSAGE_TEMPLATES_FULL: &str = "Больше 500 шаблонов не храним — удалите ненужные";
pub const MESSAGE_NO_NAME: &str = "Без названия шаблон не найдётся";
pub const MESSAGE_NO_URL: &str = "Пустая ссылка";

/// Пять UTM-полей. Порядок тот же, что в `UTM_KEYS` ядра.
pub const UTM_KEYS: [&str; 5] = ["source", "medium", "campaign", "content", "term"];

/// Значения меток. `BTreeMap`, а не структура: набор полей задаёт ядро, и
/// шестое (`utm_id`, `yclid`) не должно требовать миграции схемы.
pub type UtmParams = BTreeMap<String, String>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Template {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    pub params: UtmParams,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preset_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// Вход на создание шаблона: `Omit<Template, 'id'>` из ядра.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTemplate {
    pub name: String,
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default)]
    pub params: UtmParams,
    #[serde(default)]
    pub tag_name: Option<String>,
    #[serde(default)]
    pub tag_color: Option<String>,
    #[serde(default)]
    pub preset_id: Option<String>,
}

/// Частичная правка шаблона: `Partial<Omit<Template, 'id'>>`.
///
/// Двойной `Option` не нужен: поля, которых нет в запросе, остаются `None` и
/// не трогаются, а очистка тега приходит пустой строкой — так же, как в вебе.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplatePatch {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default)]
    pub params: Option<UtmParams>,
    #[serde(default)]
    pub tag_name: Option<String>,
    #[serde(default)]
    pub tag_color: Option<String>,
    #[serde(default)]
    pub preset_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItem {
    pub id: String,
    pub url: String,
    pub base_url: String,
    pub params: UtmParams,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag_color: Option<String>,
    pub origin: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub batch_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

/// Вход на запись ссылки: `Omit<HistoryItem, 'id'>`.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewHistoryItem {
    pub url: String,
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub params: UtmParams,
    #[serde(default)]
    pub short_url: Option<String>,
    #[serde(default)]
    pub tag_name: Option<String>,
    #[serde(default)]
    pub tag_color: Option<String>,
    #[serde(default)]
    pub origin: Option<String>,
    #[serde(default)]
    pub batch_id: Option<String>,
    /// Дата из импорта. Своих ссылок не касается — там всегда «сейчас».
    #[serde(default)]
    pub created_at: Option<String>,
}

/// Откуда взялась ссылка. Значения проверяет и схема (`check`), и этот список.
pub const ORIGINS: [&str; 4] = ["single", "batch", "brief", "parse"];

pub fn normalize_origin(value: Option<&str>) -> String {
    match value {
        Some(origin) if ORIGINS.contains(&origin) => origin.to_string(),
        _ => "single".to_string(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DictEntry {
    pub kind: String,
    pub value: String,
    pub uses: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canonical: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_seen_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_used_at: Option<String>,
}

/// Итог пакетной записи. Ложится на `ImportResult` ядра.
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub added: usize,
    /// Причины пропуска поимённо: «Осень 2026 — имя занято», а не число.
    pub skipped: Vec<String>,
}
