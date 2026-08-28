# -*- coding: utf-8 -*-
"""
Сбор данных для отчёта: Метрика + Вебмастер + Search Console + база продукта.

Один запуск — один снимок. Снимок кладётся в `docs/analytics/data/`: под датой
(история) и как `latest.json` (то, из чего рисуется отчёт). История нужна не
для красоты — Вебмастер отдаёт запросы только за последние недели, а GSC
хранит 16 месяцев, но не показывает, каким сайт был до правки. Свой архив
отвечает на вопрос «стало ли лучше после того, что мы сделали».

Ни один источник не обязан ответить: Вебмастер регулярно молчит на молодом
сайте, база на бесплатном тарифе засыпает. Поэтому каждый блок собирается
отдельно и при отказе пишет в снимок причину, а не роняет весь сбор.

Запуск:
    python -X utf8 scripts/analytics_pull.py            # 90 дней
    python -X utf8 scripts/analytics_pull.py --days 30
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import analytics_env as env

OUT = env.REPO / "docs" / "analytics" / "data"

#: Метрика отдаёт данные, только если попросить их поимённо.
VISIT_METRICS = "ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds"


def rows(answer, metrics_count=None):
    """Строки отчёта Метрики в простом виде: имя измерения плюс числа.

    Метрика заворачивает каждое измерение в объект с `name`, `id` и парой
    служебных полей — в снимке они не нужны, а разбирать их потом в шаблоне
    отчёта значило бы держать знание о формате API в двух местах.
    """
    if "__error__" in answer:
        return {"error": answer["__error__"], "detail": answer.get("detail", "")}
    out = []
    for row in answer.get("data", []):
        names = [(d.get("name") if d else None) or "—" for d in row.get("dimensions", [])]
        values = row.get("metrics", [])
        out.append({"key": " / ".join(names), "values": values[:metrics_count] if metrics_count else values})
    return out


def metrika_block(token, date1, date2):
    """Посещаемость, источники и достижения целей."""
    block = {}

    totals = env.metrika_stat(token, {"metrics": VISIT_METRICS, "date1": date1, "date2": date2})
    block["totals"] = (
        {"error": totals["__error__"], "detail": totals.get("detail", "")}
        if "__error__" in totals
        else dict(zip(["visits", "users", "pageviews", "bounce", "duration"], totals.get("totals", [])))
    )

    block["by_day"] = rows(
        env.metrika_stat(
            token,
            {"metrics": "ym:s:visits,ym:s:users", "dimensions": "ym:s:date",
             "date1": date1, "date2": date2, "sort": "ym:s:date", "limit": "400"},
        )
    )
    block["sources"] = rows(
        env.metrika_stat(
            token,
            {"metrics": "ym:s:visits,ym:s:users,ym:s:bounceRate",
             "dimensions": "ym:s:lastSignTrafficSource", "date1": date1, "date2": date2, "limit": "20"},
        )
    )
    block["search_engines"] = rows(
        env.metrika_stat(
            token,
            {"metrics": "ym:s:visits", "dimensions": "ym:s:lastSignSearchEngine",
             "date1": date1, "date2": date2, "limit": "20"},
        )
    )
    block["phrases"] = rows(
        env.metrika_stat(
            token,
            {"metrics": "ym:s:visits", "dimensions": "ym:s:lastSignSearchPhrase",
             "date1": date1, "date2": date2, "limit": "50"},
        )
    )
    block["landing_pages"] = rows(
        env.metrika_stat(
            token,
            {"metrics": "ym:s:visits,ym:s:bounceRate,ym:s:avgVisitDurationSeconds",
             "dimensions": "ym:s:startURLPath", "date1": date1, "date2": date2, "limit": "50"},
        )
    )
    block["devices"] = rows(
        env.metrika_stat(
            token,
            {"metrics": "ym:s:visits", "dimensions": "ym:s:deviceCategory",
             "date1": date1, "date2": date2, "limit": "10"},
        )
    )

    # ── Цели ──────────────────────────────────────────────────────────────────
    # Идентификаторы целей спрашиваем у панели, а имена событий берём из кода:
    # так отчёт показывает ровно те цели, которые заводил `analytics_goals`,
    # и не врёт, если в панели что-то завели руками поверх.
    wanted = env.track_events()
    listing = env.request(
        f"https://api-metrika.yandex.net/management/v1/counter/{env.COUNTER_ID}/goals",
        headers={"Authorization": f"OAuth {token}"},
    )
    goals = []
    if "__error__" not in listing:
        for goal in listing.get("goals", []):
            keys = [c.get("url") for c in goal.get("conditions", []) if c.get("type") == "exact"]
            key = keys[0] if keys else ""
            if key in wanted:
                goals.append({"key": key, "id": goal["id"], "name": wanted[key]})

    if goals:
        metrics = ",".join(f"ym:s:goal{g['id']}reaches" for g in goals)
        answer = env.metrika_stat(token, {"metrics": metrics, "date1": date1, "date2": date2})
        totals_list = [] if "__error__" in answer else answer.get("totals", [])
        for index, goal in enumerate(goals):
            goal["reaches"] = totals_list[index] if index < len(totals_list) else 0
    block["goals"] = goals

    # Цели в разрезе страницы входа — тот самый ответ на «какая посадочная
    # приводит людей, которые доходят до результата», без параметров в событии.
    if goals:
        main = next((g for g in goals if g["key"] == "link_copied"), goals[0])
        block["goal_by_page"] = {
            "goal": main["name"],
            "rows": rows(
                env.metrika_stat(
                    token,
                    {"metrics": f"ym:s:visits,ym:s:goal{main['id']}reaches",
                     "dimensions": "ym:s:startURLPath", "date1": date1, "date2": date2, "limit": "30"},
                )
            ),
        }
    return block


def webmaster_block(token, date1, date2):
    """Индексация, запросы и карта сайта в Яндексе."""
    uid = env.webmaster_user_id(token)
    block = {"user_id": uid}

    block["summary"] = env.webmaster(token, uid, "/summary")
    block["in_search"] = env.webmaster(token, uid, "/search-urls/in-search/history")
    block["sitemaps"] = env.webmaster(token, uid, "/user-added-sitemaps")

    query = urllib.parse.urlencode(
        [
            ("order_by", "TOTAL_SHOWS"),
            ("query_indicator", "TOTAL_SHOWS"),
            ("query_indicator", "TOTAL_CLICKS"),
            ("query_indicator", "AVG_SHOW_POSITION"),
            ("query_indicator", "AVG_CLICK_POSITION"),
            ("limit", "100"),
        ]
    )
    block["queries"] = env.webmaster(token, uid, f"/search-queries/popular?{query}")

    # ⚠️ Диагностика лежит не там, где ждёшь: `/site-problems` отвечает 404,
    # рабочий путь — `/diagnostics`. Проверено на этом же хосте.
    block["diagnostics"] = env.webmaster(token, uid, "/diagnostics")
    return block


def gsc_block(date1, date2):
    """То же самое со стороны Google. Молодой сайт тут обычно пуст — и это
    не ошибка сбора, а сам факт: Google берёт новые поддомены медленно."""
    try:
        token = env.gsc_token()
    except env.Missing as error:
        return {"error": str(error)}

    def analytics(dimensions, limit=100):
        answer = env.gsc(
            token,
            "/searchAnalytics/query",
            method="POST",
            body={"startDate": date1, "endDate": date2, "dimensions": dimensions, "rowLimit": limit},
        )
        if "__error__" in answer:
            return {"error": answer["__error__"], "detail": answer.get("detail", "")}
        return [
            {"key": " / ".join(row.get("keys", [])), "clicks": row.get("clicks", 0),
             "impressions": row.get("impressions", 0), "ctr": row.get("ctr", 0),
             "position": row.get("position", 0)}
            for row in answer.get("rows", [])
        ]

    return {
        "by_day": analytics(["date"], 400),
        "queries": analytics(["query"], 100),
        "pages": analytics(["page"], 50),
        "sitemaps": env.gsc(token, "/sitemaps"),
    }


def product_block(days):
    """Продуктовые числа прямо из базы: сколько ссылок собрано и чем.

    Это единственный источник, который не зависит ни от согласия на куки, ни
    от блокировщиков: счётчик видит визиты, база — результат. Расхождение
    между ними само по себе полезно.
    """
    try:
        url, key = env.supabase_access()
    except env.Missing as error:
        return {"available": False, "why": str(error)}

    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Accept-Profile": "utmka"}
    since = (date.today() - timedelta(days=days)).isoformat()

    def count(table, query="", column="id"):
        """Число строк без выгрузки самих строк: PostgREST отдаёт его заголовком.

        Колонка выбирается явно: у `users` первичный ключ — `hash`, поля `id`
        там нет вовсе, и запрос падает на `column users.id does not exist`.
        """
        request = urllib.request.Request(
            f"{url}/rest/v1/{table}?select={column}{query}",
            headers=dict(headers, **{"Prefer": "count=exact", "Range": "0-0"}),
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                total = (response.headers.get("Content-Range") or "*/0").split("/")[-1]
                return int(total) if total.isdigit() else 0
        except urllib.error.HTTPError as error:
            # 540 — «проект на паузе»: бесплатный тариф Supabase усыпляет базу
            # после недели без запросов. Это не ошибка скрипта, а состояние
            # прода: пока база спит, у людей не работают вход и сохранение.
            raise RuntimeError(f"HTTP {error.code}: {error.read().decode('utf-8', 'replace')[:200]}")
        except Exception as error:
            raise RuntimeError(str(error))

    try:
        block = {
            "available": True,
            "users": count("users", column="hash"),
            "users_new": count("users", f"&created_at=gte.{since}", column="hash"),
            "links": count("links"),
            "links_new": count("links", f"&created_at=gte.{since}"),
            "templates": count("templates"),
            "dict_values": count("dict_values"),
        }
        block["links_by_origin"] = {
            origin: count("links", f"&origin=eq.{origin}&created_at=gte.{since}")
            for origin in ("single", "batch", "brief", "parse")
        }
        return block
    except RuntimeError as error:
        return {"available": False, "why": str(error)}


def main():
    parser = argparse.ArgumentParser(description="Снимок аналитики UTMka")
    parser.add_argument("--days", type=int, default=90, help="глубина периода в днях (по умолчанию 90)")
    args = parser.parse_args()

    date2 = date.today()
    date1 = date2 - timedelta(days=args.days)
    d1, d2 = date1.isoformat(), date2.isoformat()

    print(f"Период: {d1} … {d2} ({args.days} дн.)")

    metrika_token, webmaster_token = env.yandex_tokens()

    print("  Метрика…", end="", flush=True)
    metrika = metrika_block(metrika_token, d1, d2)
    print(" ок")

    print("  Вебмастер…", end="", flush=True)
    webmaster = webmaster_block(webmaster_token, d1, d2)
    print(" ок")

    print("  Search Console…", end="", flush=True)
    gsc = gsc_block(d1, d2)
    print(" ок")

    print("  база продукта…", end="", flush=True)
    product = product_block(args.days)
    print(" ок" if product.get("available") else " недоступна")

    snapshot = {
        "collected_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "site": env.SITE,
        "counter": env.COUNTER_ID,
        "period": {"from": d1, "to": d2, "days": args.days},
        "metrika": metrika,
        "webmaster": webmaster,
        "gsc": gsc,
        "product": product,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    body = json.dumps(snapshot, ensure_ascii=False, indent=1)
    (OUT / f"{d2}.json").write_text(body, encoding="utf-8")
    (OUT / "latest.json").write_text(body, encoding="utf-8")

    print(f"\nСнимок: {OUT / (d2 + '.json')}")
    print("Отчёт: python -X utf8 scripts/analytics_report.py")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except env.Missing as error:
        print(f"Нет доступа:\n{error}", file=sys.stderr)
        sys.exit(2)
