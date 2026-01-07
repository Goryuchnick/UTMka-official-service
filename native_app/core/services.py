from __future__ import annotations

import urllib.parse
from typing import List, Dict, Any

from .db import get_connection


def build_utm_url(
    base_url: str,
    utm_source: str | None = None,
    utm_medium: str | None = None,
    utm_campaign: str | None = None,
    utm_content: str | None = None,
    utm_term: str | None = None,
) -> str:
    """
    Собирает UTM-ссылку из базового URL и параметров.
    Логика максимально проста и не зависит от Flask.
    """
    base_url = base_url.strip()
    parsed = urllib.parse.urlparse(base_url)

    # Если в base_url уже есть параметры — сохраняем их
    query_params = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))

    def _set_if_value(key: str, value: str | None):
        if value:
            query_params[key] = value

    _set_if_value("utm_source", utm_source)
    _set_if_value("utm_medium", utm_medium)
    _set_if_value("utm_campaign", utm_campaign)
    _set_if_value("utm_content", utm_content)
    _set_if_value("utm_term", utm_term)

    new_query = urllib.parse.urlencode(query_params, doseq=True)
    new_parsed = parsed._replace(query=new_query)
    return urllib.parse.urlunparse(new_parsed)


# -------- История --------


def add_history_item(
    user_email: str,
    full_url: str,
) -> None:
    """
    Добавляет запись в историю.
    Разбирает URL на base_url и UTM-параметры.
    """
    conn = get_connection()
    cur = conn.cursor()

    base_url = full_url.split("?", 1)[0] if "?" in full_url else full_url

    utm_params: dict[str, str] = {}
    if "?" in full_url:
        params = full_url.split("?", 1)[1]
        for param in params.split("&"):
            if "=" in param:
                key, value = param.split("=", 1)
                if key.startswith("utm_"):
                    utm_params[key] = value

    cur.execute(
        """
        INSERT INTO history_new (
            user_email, base_url, full_url,
            utm_source, utm_medium, utm_campaign, utm_content, utm_term
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_email,
            base_url,
            full_url,
            utm_params.get("utm_source"),
            utm_params.get("utm_medium"),
            utm_params.get("utm_campaign"),
            utm_params.get("utm_content"),
            utm_params.get("utm_term"),
        ),
    )

    conn.commit()
    conn.close()


def get_history(user_email: str, limit: int = 500) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT * FROM history_new
        WHERE user_email = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user_email, limit),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


# -------- Шаблоны --------


def add_template(
    user_email: str,
    name: str,
    utm_source: str | None = None,
    utm_medium: str | None = None,
    utm_campaign: str | None = None,
    utm_content: str | None = None,
    utm_term: str | None = None,
    tag_name: str | None = None,
    tag_color: str | None = None,
) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO templates (
            user_email, name,
            utm_source, utm_medium, utm_campaign, utm_content, utm_term,
            tag_name, tag_color
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_email,
            name,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            tag_name,
            tag_color,
        ),
    )
    conn.commit()
    conn.close()


def get_templates(user_email: str, limit: int = 500) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT * FROM templates
        WHERE user_email = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (user_email, limit),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def delete_template(template_id: int) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM templates WHERE id = ?", (template_id,))
    conn.commit()
    conn.close()


