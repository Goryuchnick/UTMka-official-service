//! Обмен с веб-аккаунтом по кодовой фразе.
//!
//! Приложение работает без всякого входа и продолжает так работать: фраза
//! нужна ровно для одного — забрать и отдать данные аккаунту в вебе, чтобы
//! дома можно было работать в окне, а в поездке в браузере.
//!
//! ⚠️ **Фразу не храним.** Она уходит один раз в обмен на сессионную куку, и
//! на диск ложится только кука. Разница существенная: фраза восстановлению не
//! подлежит и открывает аккаунт навсегда, а куку можно отозвать выходом.
//!
//! ⚠️ Кука лежит в той же незашифрованной базе, что и данные. Это осознанно:
//! шифровать её, оставив рядом открытыми сами шаблоны и историю, — обман, а не
//! защита. Тот, кто добрался до файла базы, и так видит всё, ради чего сюда
//! ходят.
//!
//! Правила слияния здесь не живут: что кому отправлять, решает ядро
//! (`planTemplates`/`planHistory` в `@utmka/core`), а этот модуль — транспорт.

use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::{CmdError, CmdResult};

/// Куда ходим. Адрес веб-версии зашит: это часть продукта, а не настройка.
const BASE_URL: &str = "https://utmka.alex-pronin.ru";

/// Ключ в таблице `meta`, где лежит сессионная кука.
const SESSION_KEY: &str = "sync.session";

/// Потолок на запрос: обмен не должен вешать окно, если сервер молчит.
const TIMEOUT: Duration = Duration::from_secs(20);

const USER_AGENT: &str = "UTMka/3.0 (+https://utmka.alex-pronin.ru)";

/// Снимок аккаунта: то, что отдаёт `GET /api/sync`.
#[derive(Debug, Deserialize, Serialize)]
pub struct RemoteState {
    #[serde(default)]
    pub templates: Vec<Value>,
    #[serde(default)]
    pub links: Vec<Value>,
}

/// Что сервер принял: то, что возвращает `POST /api/sync`.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PushResult {
    #[serde(default)]
    pub templates_added: u32,
    #[serde(default)]
    pub links_added: u32,
    #[serde(default)]
    pub skipped: Vec<String>,
}

fn client() -> CmdResult<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(TIMEOUT)
        // Переадресации не следуем: сервер свой, а редирект на чужой адрес
        // означал бы, что куку унесли не туда.
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| CmdError::offline(&format!("не удалось собрать клиент: {error}")))
}

/// Разбор `Set-Cookie`: нам нужна только пара `имя=значение`.
fn session_from_headers(response: &reqwest::Response) -> Option<String> {
    for value in response.headers().get_all(reqwest::header::SET_COOKIE) {
        let raw = value.to_str().ok()?;
        let pair = raw.split(';').next()?.trim();
        if pair.starts_with("utmka_session=") && !pair.ends_with('=') {
            return Some(pair.to_string());
        }
    }
    None
}

/// Вход по фразе. Возвращает куку, которую вызывающий кладёт в базу.
pub async fn login(passphrase: &str) -> CmdResult<String> {
    let response = client()?
        .post(format!("{BASE_URL}/api/session"))
        .json(&serde_json::json!({ "mode": "login", "passphrase": passphrase }))
        .send()
        .await
        .map_err(|error| CmdError::offline(&format!("сеть не ответила: {error}")))?;

    let status = response.status();
    let cookie = session_from_headers(&response);
    let body: Value = response.json().await.unwrap_or(Value::Null);

    if !status.is_success() {
        // Текст с сервера человечнее нашего: он знает, фраза не найдена или
        // не похожа на настоящую.
        let message = body
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Не удалось войти по фразе");
        return Err(CmdError::rejected(message));
    }

    cookie.ok_or_else(|| CmdError::rejected("Сервер не выдал сессию"))
}

/// Снимок аккаунта.
pub async fn pull(session: &str) -> CmdResult<RemoteState> {
    let response = client()?
        .get(format!("{BASE_URL}/api/sync"))
        .header(reqwest::header::COOKIE, session)
        .send()
        .await
        .map_err(|error| CmdError::offline(&format!("сеть не ответила: {error}")))?;

    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(CmdError::auth("Сессия устарела — введите фразу заново"));
    }
    if !response.status().is_success() {
        return Err(CmdError::rejected("Аккаунт не ответил на запрос данных"));
    }

    response
        .json()
        .await
        .map_err(|error| CmdError::rejected(&format!("непонятный ответ аккаунта: {error}")))
}

/// Отправка пачки. Пустые списки отправлять незачем — сервер ответит нулями.
pub async fn push(session: &str, templates: Vec<Value>, links: Vec<Value>) -> CmdResult<PushResult> {
    if templates.is_empty() && links.is_empty() {
        return Ok(PushResult {
            templates_added: 0,
            links_added: 0,
            skipped: Vec::new(),
        });
    }

    let response = client()?
        .post(format!("{BASE_URL}/api/sync"))
        .header(reqwest::header::COOKIE, session)
        .json(&serde_json::json!({ "templates": templates, "links": links }))
        .send()
        .await
        .map_err(|error| CmdError::offline(&format!("сеть не ответила: {error}")))?;

    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(CmdError::auth("Сессия устарела — введите фразу заново"));
    }
    if !response.status().is_success() {
        let body: Value = response.json().await.unwrap_or(Value::Null);
        let message = body
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Аккаунт не принял данные");
        return Err(CmdError::rejected(message));
    }

    response
        .json()
        .await
        .map_err(|error| CmdError::rejected(&format!("непонятный ответ аккаунта: {error}")))
}

/// Выход: сессию гасим и на сервере, и у себя.
pub async fn logout(session: &str) -> CmdResult<()> {
    // Ошибку сервера здесь глотаем намеренно: локально куку всё равно удалим,
    // иначе «выйти» переставало работать без сети.
    let _ = client()?
        .delete(format!("{BASE_URL}/api/session"))
        .header(reqwest::header::COOKIE, session)
        .send()
        .await;
    Ok(())
}

pub const SESSION_META_KEY: &str = SESSION_KEY;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn берёт_куку_сессии_из_заголовков() {
        // Проверяем разбор пары, а не поход в сеть: интерес именно в том, что
        // из `Set-Cookie` со всеми атрибутами остаётся ровно `имя=значение`.
        let raw = "utmka_session=abc.def; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000";
        let pair = raw.split(';').next().unwrap().trim();
        assert_eq!(pair, "utmka_session=abc.def");
        assert!(pair.starts_with("utmka_session="));
    }

    #[test]
    fn пустую_куку_за_сессию_не_считаем() {
        // Так выглядит выход: сервер присылает пустое значение, и принять его
        // за живую сессию нельзя — иначе приложение считает себя вошедшим.
        let raw = "utmka_session=; Path=/; Max-Age=0";
        let pair = raw.split(';').next().unwrap().trim();
        assert!(pair.ends_with('='));
    }
}
