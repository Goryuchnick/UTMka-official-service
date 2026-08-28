# -*- coding: utf-8 -*-
"""
Доступы и общие мелочи для аналитики UTMka.

Один модуль на три скрипта (`analytics_goals`, `analytics_pull`,
`analytics_report`), потому что поиск токенов — единственное, что у них общего,
и разъехаться он не имеет права: цели, заведённые в одном счётчике, а читаемые
из другого, — самая тихая из возможных ошибок.

Где живут ключи:

* Яндекс (Метрика + Вебмастер) — личные OAuth-токены владельца. Исторически
  лежат в `welcome/analytycs-welcome/.env` (там их завели первыми), поэтому
  путь по умолчанию ведёт туда; переопределяется переменной `UTMKA_YANDEX_ENV`.
  Копию токена в репозиторий продукта НЕ кладём: два экземпляра секрета
  протухают по очереди, и второй потом ищут полдня.
* Google Search Console — не токен, а gcloud ADC на машине владельца. Живой
  ключ печатает сам gcloud; нам нужен только путь к нему и quota project,
  без которого API отвечает 403.
* Supabase — служебный ключ приложения из `apps/web/.env.local`. Тот же файл,
  которым живёт прод: продуктовые числа читаются из той же базы, что их пишет.

⚠️ Всё перечисленное — секреты. Модуль их только читает и никуда не печатает:
в отчёт уезжают числа, а не ключи.
"""

from __future__ import annotations

import json
import os
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
WORKSPACE = REPO.parent.parent

#: Счётчик Метрики инструмента. Не общий с сайтом: у инструмента своя воронка.
COUNTER_ID = "111529339"

#: Сайт. В Вебмастере он же выглядит как `https:домен:443` — это их формат id.
SITE = "https://utmka.alex-pronin.ru"
WEBMASTER_HOST_ID = "https:utmka.alex-pronin.ru:443"

#: Quota project для Search Console. Без заголовка `X-Goog-User-Project` — 403.
GSC_QUOTA_PROJECT = "utility-descent-472021-f7"

DEFAULT_YANDEX_ENV = WORKSPACE / "welcome" / "analytycs-welcome" / ".env"
DEFAULT_GCLOUD = (
    Path(os.environ.get("LOCALAPPDATA", "")) / "Google" / "google-cloud-sdk" / "bin" / "gcloud.cmd"
)


class Missing(RuntimeError):
    """Не хватает доступа. Сообщение адресовано человеку, а не логу."""


def read_env(path):
    """Разбор `.env`. Без зависимостей: файл простой, а тянуть `python-dotenv`
    ради пяти строк в скрипт, который гоняют раз в неделю, незачем."""
    values = {}
    if not path.exists():
        return values
    # utf-8-sig: Windows-редакторы любят оставить BOM, и первая переменная
    # тогда называется «﻿SUPABASE_URL» — глазами это не заметить.
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def yandex_tokens():
    """Токены Метрики и Вебмастера: сперва окружение, потом файл."""
    env_path = Path(os.environ.get("UTMKA_YANDEX_ENV", DEFAULT_YANDEX_ENV))
    file_env = read_env(env_path)

    metrika = os.environ.get("YANDEX_OAUTH_TOKEN") or file_env.get("YANDEX_OAUTH_TOKEN", "")
    webmaster = os.environ.get("WEBMASTER_OAUTH_TOKEN") or file_env.get("WEBMASTER_OAUTH_TOKEN", "")
    if not metrika or not webmaster:
        raise Missing(
            "Не нашёл OAuth-токены Яндекса.\n"
            f"Искал в переменных окружения и в {env_path}.\n"
            "Задайте UTMKA_YANDEX_ENV=путь к .env с YANDEX_OAUTH_TOKEN и WEBMASTER_OAUTH_TOKEN."
        )
    return metrika, webmaster


def supabase_access():
    """URL и служебный ключ базы — из того же файла, которым живёт прод."""
    env = read_env(REPO / "apps" / "web" / ".env.local")
    url = os.environ.get("SUPABASE_URL") or env.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise Missing("Нет SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY в apps/web/.env.local")
    return url.rstrip("/"), key


def gsc_token():
    """Живой access-token из gcloud ADC.

    Печатает его сам gcloud — своей копии учётных данных у скрипта нет.
    Токен короткоживущий, поэтому берётся на каждый запуск заново.
    """
    gcloud = Path(os.environ.get("UTMKA_GCLOUD", DEFAULT_GCLOUD))
    if not gcloud.exists():
        raise Missing(f"gcloud не найден: {gcloud}. Задайте UTMKA_GCLOUD=путь к gcloud.cmd")
    try:
        out = subprocess.run(
            [str(gcloud), "auth", "application-default", "print-access-token"],
            capture_output=True,
            text=True,
            timeout=120,
            check=True,
        )
    except subprocess.CalledProcessError as error:
        raise Missing(
            "gcloud не отдал токен. Похоже, ADC протух — обновите:\n"
            "  gcloud auth application-default login\n"
            f"Ответ: {(error.stderr or '').strip()[:300]}"
        ) from error
    return out.stdout.strip()


def request(url, *, headers, method="GET", body=None, timeout=90):
    """Один HTTP-запрос с разбором JSON.

    Ошибку не глотаем, но и не роняем весь сбор: возвращаем `{"__error__": …}`,
    чтобы отчёт собрался с пометкой «источник молчал». Молчащий Вебмастер —
    обычное дело, и терять из-за него данные Метрики глупо.
    """
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers = dict(headers)
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:400]
        return {"__error__": f"HTTP {error.code}", "detail": detail}
    except Exception as error:  # сеть, таймаут, битый JSON
        return {"__error__": str(error)}


def metrika_stat(token, params):
    """Отчёт Метрики. Счётчик подставляется здесь, чтобы не забыть его нигде."""
    full = {"ids": COUNTER_ID}
    full.update(params)
    query = urllib.parse.urlencode(full)
    return request(
        f"https://api-metrika.yandex.net/stat/v1/data?{query}",
        headers={"Authorization": f"OAuth {token}"},
    )


def webmaster_user_id(token):
    """Идентификатор аккаунта Вебмастера. Отдельно, чтобы не спрашивать его на
    каждый запрос: он один на всё время работы скрипта."""
    user = request(
        "https://api.webmaster.yandex.net/v4/user/",
        headers={"Authorization": f"OAuth {token}"},
    )
    return str(user.get("user_id", ""))


def webmaster(token, uid, path, *, method="GET", body=None):
    """Запрос к Вебмастеру относительно нашего хоста."""
    if not uid:
        return {"__error__": "не удалось узнать user_id Вебмастера"}
    host = urllib.parse.quote(WEBMASTER_HOST_ID, safe="")
    url = f"https://api.webmaster.yandex.net/v4/user/{uid}/hosts/{host}{path}"
    return request(url, headers={"Authorization": f"OAuth {token}"}, method=method, body=body)


def gsc(token, path, *, method="GET", body=None):
    """Запрос к Search Console по нашему свойству."""
    site = urllib.parse.quote(f"{SITE}/", safe="")
    return request(
        f"https://searchconsole.googleapis.com/webmasters/v3/sites/{site}{path}",
        headers={"Authorization": f"Bearer {token}", "X-Goog-User-Project": GSC_QUOTA_PROJECT},
        method=method,
        body=body,
    )


def track_events():
    """Список целей — из `packages/core/src/track.ts`, а не из копии здесь.

    Копия рано или поздно разъедется с кодом: событие переименуют в одном
    месте, а цель в Метрике останется ловить старое имя и просто перестанет
    достигаться — без ошибки, без сигнала, тихо.
    """
    source = (REPO / "packages" / "core" / "src" / "track.ts").read_text(encoding="utf-8")
    start = source.index("TRACK_EVENT_NAMES: Record<TrackEvent, string> = {")
    block = source[start : source.index("}", start)]

    events = {}
    for line in block.splitlines()[1:]:
        line = line.strip().rstrip(",")
        if not line or ":" not in line:
            continue
        key, name = line.split(":", 1)
        events[key.strip()] = name.strip().strip("'").strip('"')
    if not events:
        raise Missing("Не разобрал TRACK_EVENT_NAMES в packages/core/src/track.ts")
    return events
