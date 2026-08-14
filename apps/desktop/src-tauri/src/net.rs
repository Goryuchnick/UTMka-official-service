//! Сеть: то, до чего вебвью не дотягивается.
//!
//! Здесь ровно два дела — сокращение через clck.ru (у сервиса нет CORS) и
//! **один** хоп цепочки переадресаций. Саму цепочку по-прежнему ведёт ядро
//! (`followRedirects` из `@utmka/core`), вызывая эту команду на каждом шаге:
//! так логика хопов, сравнение меток и тексты объяснений не дублируются на
//! втором языке и не расходятся с вебом.
//!
//! ⚠️ SSRF-вектор. В десктопе он бьёт не по серверу владельца, а по локальной
//! сети пользователя — роутер, `127.0.0.1`, NAS. Соблазн снять предохранители
//! («риск же ниже») ошибочен: ссылку в поле мог прислать кто угодно.
//!
//! Три предохранителя, все обязательные:
//! 1. схема только http/https;
//! 2. **все** адреса из DNS проверяются до подключения, и соединение идёт
//!    ровно на проверенный адрес — второго резолва не происходит, поэтому
//!    окна для DNS rebinding нет;
//! 3. автоследование редиректам выключено — иначе хопы 2..N ушли бы мимо
//!    проверок, а цепочку ведёт ядро.

use std::net::{IpAddr, SocketAddr, ToSocketAddrs};
use std::time::Duration;

use serde::Serialize;
use url::{Host, Url};

use crate::error::{CmdError, CmdResult};

/// Потолок на один хоп.
const HOP_TIMEOUT: Duration = Duration::from_secs(5);

/// Потолок на сокращение: сервис либо отвечает быстро, либо не отвечает.
const SHORTEN_TIMEOUT: Duration = Duration::from_secs(5);

/// Представляемся честно: владельцу сайта видно, кто и зачем постучался.
const USER_AGENT: &str = "UTMka/3.0 (+https://utmka.alex-pronin.ru)";

/// Единственный внешний сервис, к которому ходим по своей инициативе.
const SHORTENER: &str = "clck.ru";

/// Ответ одного хопа. Ложится на `HopResponse` ядра.
#[derive(Debug, Clone, Serialize)]
pub struct HopResponse {
    pub status: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
}

/// Публичный ли адрес.
///
/// Диапазоны те же, что в `isPublicHost` ядра. Дублирование неизбежно: ядро
/// проверяет имя хоста, а адреса из DNS видит только тот, кто резолвит, —
/// то есть эта сторона. Таблица случаев покрыта тестами ниже.
pub fn is_public_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            let [a, b, ..] = v4.octets();
            if v4.is_loopback() || v4.is_private() || v4.is_link_local() || v4.is_broadcast() {
                return false;
            }
            if a == 0 || a >= 224 {
                return false;
            }
            // CGNAT 100.64.0.0/10 — тоже не интернет.
            if a == 100 && (64..=127).contains(&b) {
                return false;
            }
            true
        }
        IpAddr::V6(v6) => {
            if v6.is_loopback() || v6.is_unspecified() {
                return false;
            }
            // IPv4-mapped (`::ffff:127.0.0.1`) — тот же адрес другими словами.
            if let Some(v4) = v6.to_ipv4_mapped() {
                return is_public_ip(&IpAddr::V4(v4));
            }
            let segments = v6.segments();
            // unique-local fc00::/7 и link-local fe80::/10
            if segments[0] & 0xfe00 == 0xfc00 || segments[0] & 0xffc0 == 0xfe80 {
                return false;
            }
            true
        }
    }
}

/// Имена, которые не пускаем, даже не резолвя.
fn is_blocked_hostname(host: &str) -> bool {
    let host = host.trim_matches(|c| c == '[' || c == ']').to_ascii_lowercase();
    host == "localhost"
        || host.ends_with(".localhost")
        || host.ends_with(".local")
        || host.ends_with(".internal")
        || host.ends_with(".lan")
        || host.ends_with(".home")
        || host.ends_with(".corp")
}

/// Разобрать адрес и убедиться, что по нему вообще можно ходить.
fn guard_url(raw: &str) -> CmdResult<Url> {
    let url = Url::parse(raw).map_err(|_| CmdError::rejected("Адрес не разбирается"))?;

    if url.scheme() != "http" && url.scheme() != "https" {
        return Err(CmdError::rejected(
            "Проверяем только http и https — по другим схемам не ходим",
        ));
    }

    match url.host() {
        Some(Host::Domain(name)) if !is_blocked_hostname(name) => Ok(url),
        Some(Host::Ipv4(ip)) if is_public_ip(&IpAddr::V4(ip)) => Ok(url),
        Some(Host::Ipv6(ip)) if is_public_ip(&IpAddr::V6(ip)) => Ok(url),
        _ => Err(CmdError::rejected(
            "Адрес ведёт внутрь сети, а не в интернет. Такие проверки мы не выполняем",
        )),
    }
}

/// Резолвим имя один раз и проверяем **каждый** полученный адрес.
///
/// Проверять все, а не первый: в ответе может лежать пара «публичный +
/// внутренний», и выбор адреса — не наше решение, а сетевого стека.
async fn resolve_guarded(url: &Url) -> CmdResult<Vec<SocketAddr>> {
    let host = url
        .host_str()
        .ok_or_else(|| CmdError::rejected("В адресе нет имени хоста"))?
        .to_string();
    let port = url.port_or_known_default().unwrap_or(80);

    let addresses = tauri::async_runtime::spawn_blocking(move || {
        (host.as_str(), port)
            .to_socket_addrs()
            .map(|iter| iter.collect::<Vec<_>>())
    })
    .await
    .map_err(|error| CmdError::offline(format!("Резолвер не ответил: {error}")))?
    .map_err(|_| CmdError::offline("Имя не резолвится — проверьте адрес"))?;

    if addresses.is_empty() {
        return Err(CmdError::offline("Имя никуда не резолвится"));
    }

    if addresses.iter().any(|addr| !is_public_ip(&addr.ip())) {
        return Err(CmdError::rejected(
            "Адрес ведёт внутрь сети, а не в интернет. Такие проверки мы не выполняем",
        ));
    }

    Ok(addresses)
}

/// Клиент под один запрос: без автоследования и с закреплённым адресом.
fn client_for(url: &Url, addresses: &[SocketAddr]) -> CmdResult<reqwest::Client> {
    let host = url.host_str().unwrap_or_default().to_string();

    let mut builder = reqwest::Client::builder()
        // Цепочку ведёт ядро: следовать самим — значит увести хопы 2..N мимо
        // предохранителей.
        .redirect(reqwest::redirect::Policy::none())
        .user_agent(USER_AGENT)
        // Потолок общий на запрос, а не на простой соединения: он обязан
        // тикать и на резолве, и на TCP-хендшейке — это ровно те фазы,
        // которыми управляет чужой сервер.
        .timeout(HOP_TIMEOUT)
        .connect_timeout(HOP_TIMEOUT);

    // Подключаемся ровно на проверенные адреса — второго резолва не будет,
    // а значит не будет и окна для подмены записи между проверкой и коннектом.
    for addr in addresses {
        builder = builder.resolve(&host, *addr);
    }

    builder
        .build()
        .map_err(|error| CmdError::offline(format!("Не удалось поднять клиент: {error}")))
}

/// Один хоп: код ответа и `Location`. Тело не читаем принципиально.
pub async fn hop(raw_url: &str) -> CmdResult<HopResponse> {
    let url = guard_url(raw_url)?;
    let addresses = resolve_guarded(&url).await?;
    let client = client_for(&url, &addresses)?;

    let response = client
        .get(url.as_str())
        .send()
        .await
        .map_err(|error| CmdError::offline(format!("Страница не ответила: {error}")))?;

    let status = response.status().as_u16();
    let location = response
        .headers()
        .get(reqwest::header::LOCATION)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);

    // Тело чужой страницы нам не нужно — соединение закрываем, не читая.
    drop(response);

    Ok(HopResponse { status, location })
}

/// Сокращение через clck.ru — тот же сервис, что в 2.2.
pub async fn shorten(raw_url: &str) -> CmdResult<String> {
    let url = guard_url(raw_url)?;

    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(SHORTEN_TIMEOUT)
        .build()
        .map_err(|error| CmdError::offline(format!("Не удалось поднять клиент: {error}")))?;

    // Единственный адрес, куда приложение ходит по своей инициативе.
    let endpoint = format!(
        "https://{SHORTENER}/--?url={}",
        urlencoding_component(url.as_str())
    );

    let response = client
        .get(&endpoint)
        .send()
        .await
        .map_err(|_| CmdError::offline("Сервис сокращения не ответил"))?;

    if !response.status().is_success() {
        return Err(CmdError::offline(format!(
            "Сервис ответил {}",
            response.status().as_u16()
        )));
    }

    let short = response
        .text()
        .await
        .map_err(|_| CmdError::offline("Сервис сокращения не ответил"))?
        .trim()
        .to_string();

    if !short.starts_with("http://") && !short.starts_with("https://") {
        return Err(CmdError::rejected("Сервис вернул не ссылку"));
    }

    Ok(short)
}

/// Кодирование адреса для строки запроса: своё, чтобы не тянуть зависимость.
fn urlencoding_component(value: &str) -> String {
    let mut out = String::with_capacity(value.len() * 3);
    for byte in value.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Таблица случаев перенесена из `apps/web/test/redirect-fetch.test.ts`:
    /// портируем сценарии, а не код — иначе на Rust получился бы «просто
    /// http-клиент с десятью хопами», а предохранители потерялись бы.
    #[test]
    fn loopback_is_blocked_in_every_notation() {
        for raw in [
            "http://127.0.0.1/",
            "http://127.1/",
            "http://2130706433/",
            "http://0177.0.0.1/",
            "http://[::1]/",
            "http://[::ffff:127.0.0.1]/",
        ] {
            assert!(guard_url(raw).is_err(), "{raw} обязан блокироваться");
        }
    }

    #[test]
    fn private_ranges_are_blocked() {
        for ip in ["10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1"] {
            let parsed: IpAddr = ip.parse().unwrap();
            assert!(!is_public_ip(&parsed), "{ip} — не интернет");
        }
    }

    #[test]
    fn public_addresses_pass() {
        for ip in ["8.8.8.8", "93.184.216.34", "172.32.0.1"] {
            let parsed: IpAddr = ip.parse().unwrap();
            assert!(is_public_ip(&parsed), "{ip} — обычный публичный адрес");
        }
    }

    #[test]
    fn internal_names_are_blocked_without_dns() {
        for raw in [
            "http://localhost/",
            "http://db.local/",
            "http://api.internal/",
            "http://nas.lan/",
        ] {
            assert!(guard_url(raw).is_err(), "{raw} не должен даже резолвиться");
        }
    }

    #[test]
    fn only_http_schemes_allowed() {
        for raw in ["file:///etc/passwd", "ftp://example.com/", "gopher://example.com/"] {
            assert!(guard_url(raw).is_err(), "{raw} — не наша схема");
        }
    }

    #[test]
    fn public_name_passes_guard() {
        // Имя проходит проверку по схеме; адрес проверяется отдельно, уже из
        // DNS, — так `localtest.me` с публичным именем и приватным адресом
        // не проскакивает.
        assert!(guard_url("https://example.com/page?utm_source=vk").is_ok());
    }

    #[test]
    fn url_component_encoding_keeps_placeholders_intact() {
        // Плейсхолдеры площадок обязаны доехать буквально — кодирование
        // применяется только на уровне строки запроса нашего же вызова.
        let encoded = urlencoding_component("https://site.ru/?utm_term={keyword}");
        assert!(encoded.contains("%7Bkeyword%7D"));
        assert!(!encoded.contains(' '));
    }
}
