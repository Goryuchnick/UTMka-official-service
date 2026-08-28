# -*- coding: utf-8 -*-
"""
Отчёт по снимку: `docs/analytics/data/latest.json` → `docs/analytics/report.html`.

Самодостаточный HTML: ни одного внешнего запроса, открывается двойным кликом
с диска. Это правило воркспейса, но здесь оно ещё и практическое — отчёт живёт
рядом с кодом, к которому относится, и не протухает отдельной ссылкой.

Графиков ровно два, и оба одиночные: при нынешних числах (десятки визитов)
любая дополнительная линия — украшение, а не знание. Всё остальное — таблицы
и плитки, потому что «46» читается числом, а не столбиком.

Запуск:
    python -X utf8 scripts/analytics_report.py
"""

from __future__ import annotations

import html
import json
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import analytics_env as env

DATA = env.REPO / "docs" / "analytics" / "data" / "latest.json"
OUT = env.REPO / "docs" / "analytics" / "report.html"

#: Проверенная палитра (см. dataviz: обе серии проходят CVD и контраст).
#: Серий по одной на график, поэтому слотов нужно всего два.
SERIES_1 = "#2a78d6"  # визиты
SERIES_2 = "#1baf7a"  # страницы в поиске


def esc(value):
    return html.escape(str(value), quote=True)


def num(value, digits=0):
    """Число по-русски: неразрывный пробел между разрядами, запятая в дроби."""
    if value is None:
        return "—"
    try:
        value = float(value)
    except (TypeError, ValueError):
        return esc(value)
    text = f"{value:,.{digits}f}".replace(",", " ").replace(".", ",")
    return text


def get_rows(block, key):
    """Строки отчёта или пустой список, если источник ответил ошибкой."""
    value = block.get(key)
    return value if isinstance(value, list) else []


def error_of(block, key):
    value = block.get(key)
    return value.get("error") if isinstance(value, dict) and "error" in value else None


# ── Графики ──────────────────────────────────────────────────────────────────


def bars(points, color, *, height=120, label=""):
    """Столбики по дням. Ширина в процентах, поэтому SVG тянется по контейнеру.

    Подписи — только у краёв и максимума: число над каждым столбиком в ряду из
    девяноста превращает график в кашу и ничего не добавляет.
    """
    if not points:
        return '<p class="empty">Данных за период нет.</p>'

    top = max(v for _, v in points) or 1
    width = 1000
    gap = 2
    step = width / len(points)
    bar_w = max(step - gap, 1)

    parts = []
    for index, (day, value) in enumerate(points):
        if value <= 0:
            continue
        h = (value / top) * (height - 18)
        x = index * step
        y = height - 14 - h
        parts.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{h:.1f}" rx="2" fill="{color}">'
            f"<title>{esc(day)}: {num(value)}</title></rect>"
        )

    peak = max(points, key=lambda p: p[1])
    ticks = [points[0], peak, points[-1]]
    seen = set()
    labels = []
    for day, _ in ticks:
        if day in seen:
            continue
        seen.add(day)
        index = [p[0] for p in points].index(day)
        anchor = "start" if index < len(points) * 0.15 else ("end" if index > len(points) * 0.85 else "middle")
        labels.append(
            f'<text x="{index * step + bar_w / 2:.1f}" y="{height - 2}" text-anchor="{anchor}" '
            f'class="tick">{esc(day[5:])}</text>'
        )

    return (
        f'<svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" class="chart" role="img" '
        f'aria-label="{esc(label)}">'
        f'<line x1="0" y1="{height - 14}" x2="{width}" y2="{height - 14}" class="axis"/>'
        + "".join(parts)
        + "".join(labels)
        + "</svg>"
    )


def steps(points, color, *, height=120, label=""):
    """Ступенчатая линия: индексация меняется скачками, между замерами её
    значение не «плавает» — линейная интерполяция здесь врала бы."""
    if not points:
        return '<p class="empty">Данных за период нет.</p>'

    top = max(v for _, v in points) or 1
    width = 1000
    step = width / max(len(points) - 1, 1)

    path = []
    dots = []
    for index, (day, value) in enumerate(points):
        x = index * step
        y = height - 14 - (value / top) * (height - 26)
        path.append(("M" if index == 0 else "H") + (f"{x:.1f}" if index == 0 else f"{x:.1f}"))
        if index == 0:
            path = [f"M{x:.1f},{y:.1f}"]
        else:
            path.append(f"H{x:.1f}")
        path.append(f"V{y:.1f}")
        dots.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{color}">'
            f"<title>{esc(day)}: {num(value)}</title></circle>"
        )

    last_day, last_value = points[-1]
    return (
        f'<svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" class="chart" role="img" '
        f'aria-label="{esc(label)}">'
        f'<line x1="0" y1="{height - 14}" x2="{width}" y2="{height - 14}" class="axis"/>'
        f'<path d="{" ".join(path)}" fill="none" stroke="{color}" stroke-width="2"/>'
        + "".join(dots)
        + f'<text x="{width - 4}" y="{height - 2}" text-anchor="end" class="tick">'
        f"{esc(last_day[5:10])}: {num(last_value)}</text>"
        + f'<text x="4" y="{height - 2}" class="tick">{esc(points[0][0][5:10])}</text>'
        "</svg>"
    )


# ── Куски отчёта ─────────────────────────────────────────────────────────────


def tile(value, caption, note=""):
    note_html = f'<span class="tile-note">{esc(note)}</span>' if note else ""
    return (
        f'<div class="tile"><span class="tile-value">{value}</span>'
        f'<span class="tile-caption">{esc(caption)}</span>{note_html}</div>'
    )


def table(headers, rows, *, empty="Пусто."):
    if not rows:
        return f'<p class="empty">{esc(empty)}</p>'
    head = "".join(f"<th>{esc(h)}</th>" for h in headers)
    body = []
    for row in rows:
        cells = "".join(f"<td>{cell}</td>" for cell in row)
        body.append(f"<tr>{cells}</tr>")
    return f'<div class="scroll"><table><thead><tr>{head}</tr></thead><tbody>{"".join(body)}</tbody></table></div>'


def signals(data):
    """Сигналы — то, на что стоит посмотреть глазами.

    Правила простые и намеренно грубые: отчёт не ставит диагноз, он показывает
    место, где что-то изменилось или отсутствует. Каждое правило написано так,
    чтобы молчать, когда всё в порядке — иначе список читать перестанут.
    """
    out = []
    metrika, webmaster, gsc, product = data["metrika"], data["webmaster"], data["gsc"], data["product"]

    # 1. Цели заведены, но не достигаются ни разу — обычно значит, что версия
    #    с событиями ещё не выкачена, а не что людям ничего не нужно.
    goals = metrika.get("goals", [])
    if goals and all(not g.get("reaches") for g in goals):
        out.append(("серьёзно", "Ни одна цель не достигнута за период. Проверьте, выкачена ли версия с событиями."))

    # 2. Индексация просела: последний замер ниже максимума за период.
    history = webmaster.get("in_search", {}).get("history", [])
    values = [h.get("value", 0) for h in history if isinstance(h, dict)]
    if values and max(values) > values[-1]:
        out.append(("внимание", f"Страниц в поиске Яндекса: {values[-1]} — было {max(values)} за период."))

    # 3. Google принял карту, но не проиндексировал ни одной страницы.
    sitemap = (gsc.get("sitemaps") or {}).get("sitemap") or []
    for item in sitemap:
        for content in item.get("contents", []):
            if int(content.get("submitted", 0)) > 0 and int(content.get("indexed", 0)) == 0:
                out.append(("внимание", f"Google: в карте {content['submitted']} адресов, в индексе 0."))

    # 4. Диагностика Вебмастера — только то, что действительно горит сейчас.
    problems = (webmaster.get("diagnostics") or {}).get("problems") or {}
    for name, problem in problems.items():
        if problem.get("state") == "PRESENT":
            level = "серьёзно" if problem.get("severity") == "FATAL" else "внимание"
            out.append((level, f"Вебмастер: {PROBLEM_NAMES.get(name, name)}"))

    # 5. База продукта. Пауза на бесплатном тарифе — это не «нет данных для
    #    отчёта», а неработающие вход и сохранение у живых людей.
    if not product.get("available"):
        out.append(("серьёзно", f"База продукта недоступна: {product.get('why', 'причина не сообщена')}"))

    if not out:
        out.append(("хорошо", "Ничего срочного: источники ответили, провалов по индексации нет."))
    return out


#: Человеческие имена проблем Вебмастера. API отдаёт константы.
PROBLEM_NAMES = {
    "NO_METRIKA_COUNTER_CRAWL_ENABLED": "не включён обход по счётчику Метрики (ставится руками в панели)",
    "SITE_ERROR": "сайт отвечает ошибкой",
    "DISALLOWED_IN_ROBOTS": "страницы закрыты в robots.txt",
    "ERROR_IN_ROBOTS_TXT": "ошибка в robots.txt",
    "MAIN_PAGE_ERROR": "главная отвечает ошибкой",
    "SOFT_404": "мягкие 404",
    "DUPLICATE_PAGES": "дубли страниц",
    "THREATS": "угрозы безопасности",
    "NO_SITEMAP_MODIFICATIONS": "карта сайта давно не обновлялась",
    "SLOW_AVG_RESPONSE_TIME": "медленный отклик",
    "DOCUMENT_MISSING_TITLE": "страницы без title",
    "DOCUMENT_MISSING_DESCRIPTION": "страницы без description",
    "NO_ROBOTS_TXT": "нет robots.txt",
    "NO_MOBILE_OPTIMIZATION": "нет мобильной версии",
    "NOT_IN_SPRAV": "сайта нет в Яндекс.Справочнике (для сервиса без адреса — не наш случай)",
    "NO_REGIONS": "не задан регион сайта (ставится руками в панели)",
    "NO_CHATS": "не подключены чаты в поиске",
    "NO_TURBO_HOST": "нет турбо-страниц",
}


def render(data):
    metrika, webmaster, gsc, product = data["metrika"], data["webmaster"], data["gsc"], data["product"]
    period = data["period"]
    totals = metrika.get("totals", {})

    # ── Плитки ───────────────────────────────────────────────────────────────
    goals = metrika.get("goals", [])
    main_goal = next((g for g in goals if g["key"] == "link_copied"), None)
    summary = webmaster.get("summary", {})
    wm_queries = (webmaster.get("queries") or {}).get("queries") or []
    shows = sum(q.get("indicators", {}).get("TOTAL_SHOWS", 0) for q in wm_queries)
    clicks = sum(q.get("indicators", {}).get("TOTAL_CLICKS", 0) for q in wm_queries)
    gsc_days = gsc.get("by_day") if isinstance(gsc.get("by_day"), list) else []
    gsc_impressions = sum(row.get("impressions", 0) for row in gsc_days)

    tiles = [
        tile(num(totals.get("visits")), "визитов", f"{period['days']} дней"),
        tile(num(totals.get("users")), "посетителей"),
        tile(num(totals.get("bounce"), 1) + " %", "отказов"),
        tile(num(totals.get("duration")) + " с", "на сайте"),
        tile(num(summary.get("searchable_pages_count")), "страниц в поиске", "Яндекс"),
        tile(f"{num(shows)} / {num(clicks)}", "показов / кликов", "Яндекс, неделя"),
        tile(num(gsc_impressions), "показов", "Google, период"),
        tile(num(main_goal.get("reaches") if main_goal else None), "скопировано ссылок", "главная цель"),
    ]

    # ── Графики ──────────────────────────────────────────────────────────────
    visits = [(row["key"], row["values"][0]) for row in get_rows(metrika, "by_day")]
    index_history = [
        (h["date"][:10], h.get("value", 0))
        for h in (webmaster.get("in_search", {}).get("history") or [])
        if isinstance(h, dict) and h.get("date")
    ]

    # ── Таблицы ──────────────────────────────────────────────────────────────
    goals_rows = [
        (esc(g["name"]), f'<code>{esc(g["key"])}</code>', num(g.get("reaches")))
        for g in sorted(goals, key=lambda g: -(g.get("reaches") or 0))
    ]

    wm_rows = []
    for query in sorted(wm_queries, key=lambda q: -q.get("indicators", {}).get("TOTAL_SHOWS", 0)):
        ind = query.get("indicators", {})
        wm_rows.append((
            esc(query.get("query_text", "")),
            num(ind.get("TOTAL_SHOWS")),
            num(ind.get("TOTAL_CLICKS")),
            num(ind.get("AVG_SHOW_POSITION"), 1),
        ))

    gsc_queries = gsc.get("queries") if isinstance(gsc.get("queries"), list) else []
    gsc_rows = [
        (esc(row["key"]), num(row["impressions"]), num(row["clicks"]), num(row["position"], 1))
        for row in gsc_queries
    ]

    sources_rows = [
        (esc(SOURCE_NAMES.get(row["key"], row["key"])), num(row["values"][0]), num(row["values"][1]),
         num(row["values"][2], 1) + " %")
        for row in get_rows(metrika, "sources")
    ]

    # Страницы входа с достижением главной цели: единственное место, где видно,
    # какая посадочная приводит людей, доходящих до результата.
    by_page = {row["key"]: row["values"] for row in get_rows(metrika.get("goal_by_page", {}), "rows")}
    pages_rows = []
    for row in get_rows(metrika, "landing_pages"):
        page = row["key"]
        reaches = by_page.get(page, [0, 0])[1] if page in by_page else 0
        pages_rows.append((
            f'<code>{esc(page)}</code>',
            num(row["values"][0]),
            num(row["values"][1], 1) + " %",
            num(row["values"][2]) + " с",
            num(reaches),
        ))

    phrases_rows = [(esc(row["key"]), num(row["values"][0])) for row in get_rows(metrika, "phrases")]
    devices_rows = [
        (esc(DEVICE_NAMES.get(row["key"], row["key"])), num(row["values"][0]))
        for row in get_rows(metrika, "devices")
    ]

    if product.get("available"):
        origin = product.get("links_by_origin", {})
        product_html = (
            '<div class="tiles">'
            + tile(num(product["links"]), "ссылок всего", f'+{num(product["links_new"])} за период')
            + tile(num(product["users"]), "аккаунтов", f'+{num(product["users_new"])} за период')
            + tile(num(product["templates"]), "шаблонов")
            + tile(num(product["dict_values"]), "значений в справочнике")
            + "</div>"
            + table(
                ["Откуда ссылка", "За период"],
                [(esc(ORIGIN_NAMES.get(k, k)), num(v)) for k, v in origin.items()],
            )
        )
    else:
        product_html = (
            f'<p class="alert alert--bad">База не ответила: {esc(product.get("why", ""))}<br>'
            "Пока она молчит, у людей не работают вход по фразе, шаблоны, история и справочник — "
            "генератор, пакет, разбор и QR при этом живы, они целиком на стороне браузера.</p>"
        )

    signal_html = "".join(
        f'<li class="signal signal--{LEVEL_CLASS[level]}"><b>{esc(level)}</b> {esc(text)}</li>'
        for level, text in signals(data)
    )

    collected = data.get("collected_at", "")[:16].replace("T", " ")

    return TEMPLATE.format(
        site=esc(data["site"]),
        counter=esc(data["counter"]),
        period=f'{esc(period["from"])} — {esc(period["to"])}',
        days=period["days"],
        collected=esc(collected),
        signals=signal_html,
        tiles="".join(tiles),
        visits_chart=bars(visits, SERIES_1, label="Визиты по дням"),
        index_chart=steps(index_history, SERIES_2, label="Страниц в поиске Яндекса"),
        goals_table=table(["Цель", "Событие", "Достижений"], goals_rows, empty="Целей в счётчике нет."),
        wm_table=table(["Запрос", "Показы", "Клики", "Позиция"], wm_rows,
                       empty="Вебмастер пока не отдаёт запросы — обычное дело для молодого сайта."),
        gsc_table=table(["Запрос", "Показы", "Клики", "Позиция"], gsc_rows,
                        empty="В Google показов нет: сайт ещё не в индексе."),
        sources_table=table(["Источник", "Визиты", "Посетители", "Отказы"], sources_rows),
        pages_table=table(["Страница входа", "Визиты", "Отказы", "Время", "Скопировано"], pages_rows),
        phrases_table=table(["Фраза", "Визиты"], phrases_rows, empty="Поискового трафика за период не было."),
        devices_table=table(["Устройство", "Визиты"], devices_rows),
        product=product_html,
        year=date.today().year,
    )


SOURCE_NAMES = {
    "Direct traffic": "прямые заходы",
    "Link traffic": "переходы по ссылкам",
    "Search engine traffic": "поиск",
    "Cached page traffic": "сохранённые копии",
    "Internal traffic": "внутренние переходы",
    "Social network traffic": "соцсети",
    "Ad traffic": "реклама",
    "Messenger traffic": "мессенджеры",
    "Recommendation system traffic": "рекомендательные системы",
}

DEVICE_NAMES = {"PC": "компьютеры", "Smartphones": "смартфоны", "Tablets": "планшеты", "TV": "телевизоры"}

ORIGIN_NAMES = {"single": "генератор", "batch": "пакет", "brief": "помощник", "parse": "разбор"}

LEVEL_CLASS = {"серьёзно": "bad", "внимание": "warn", "хорошо": "good"}


TEMPLATE = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UTMka — аналитика</title>
<style>
  :root {{
    color-scheme: light;
    --bg: #f4f4f2;
    --surface: #fcfcfb;
    --line: #e2e1dc;
    --text: #0b0b0b;
    --muted: #52514e;
    --series-1: #2a78d6;
    --series-2: #1baf7a;
    --bad: #c02a2a;
    --warn: #9a6b00;
    --good: #12694c;
  }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{
      color-scheme: dark;
      --bg: #121211;
      --surface: #1a1a19;
      --line: #33322e;
      --text: #ffffff;
      --muted: #c3c2b7;
      --series-1: #3987e5;
      --series-2: #199e70;
      --bad: #e66767;
      --warn: #d9a441;
      --good: #4bbf90;
    }}
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    padding: 24px 20px 64px;
    background: var(--bg);
    color: var(--text);
    font: 15px/1.55 "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  }}
  main {{ max-width: 1080px; margin: 0 auto; }}
  header {{ margin-bottom: 24px; }}
  h1 {{ font-size: 22px; margin: 0 0 4px; letter-spacing: -0.01em; }}
  .meta {{ color: var(--muted); font-size: 13px; }}
  .meta code {{ font-size: 12px; }}
  h2 {{ font-size: 16px; margin: 32px 0 10px; }}
  h3 {{ font-size: 14px; margin: 20px 0 8px; color: var(--muted); font-weight: 600; }}
  section {{ background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
             padding: 16px 18px 20px; margin-bottom: 16px; }}
  .tiles {{ display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }}
  .tile {{ border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; display: flex;
           flex-direction: column; gap: 2px; }}
  .tile-value {{ font-size: 26px; font-weight: 650; letter-spacing: -0.02em; }}
  .tile-caption {{ color: var(--muted); font-size: 13px; }}
  .tile-note {{ color: var(--muted); font-size: 11px; opacity: .8; }}
  ul.signals {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }}
  .signal {{ padding: 8px 12px; border-left: 3px solid var(--line); border-radius: 0 6px 6px 0;
             background: color-mix(in srgb, var(--line) 25%, transparent); font-size: 14px; }}
  .signal b {{ text-transform: uppercase; font-size: 11px; letter-spacing: .04em; margin-right: 8px; }}
  .signal--bad {{ border-left-color: var(--bad); }}
  .signal--bad b {{ color: var(--bad); }}
  .signal--warn {{ border-left-color: var(--warn); }}
  .signal--warn b {{ color: var(--warn); }}
  .signal--good {{ border-left-color: var(--good); }}
  .signal--good b {{ color: var(--good); }}
  .chart {{ width: 100%; height: 130px; display: block; margin: 4px 0 2px; }}
  .axis {{ stroke: var(--line); stroke-width: 1; }}
  .tick {{ fill: var(--muted); font-size: 11px; font-family: inherit; }}
  .scroll {{ overflow-x: auto; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
  th, td {{ text-align: right; padding: 6px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }}
  th:first-child, td:first-child {{ text-align: left; white-space: normal; }}
  th {{ color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase;
        letter-spacing: .03em; }}
  tbody tr:last-child td {{ border-bottom: none; }}
  code {{ font-family: "Cascadia Mono", Consolas, "SF Mono", monospace; font-size: 12.5px;
          background: color-mix(in srgb, var(--line) 40%, transparent); padding: 1px 5px; border-radius: 4px; }}
  .empty {{ color: var(--muted); font-size: 14px; margin: 6px 0; }}
  .alert {{ padding: 10px 12px; border-radius: 8px; font-size: 14px;
            background: color-mix(in srgb, var(--bad) 12%, transparent); }}
  .two {{ display: grid; gap: 18px; grid-template-columns: 1fr; }}
  @media (min-width: 780px) {{ .two {{ grid-template-columns: 1fr 1fr; }} }}
  footer {{ color: var(--muted); font-size: 12.5px; margin-top: 28px; }}
</style>
</head>
<body>
<main>
  <header>
    <h1>UTMka — аналитика</h1>
    <p class="meta">{site} · счётчик {counter} · период {period} ({days} дн.) · снято {collected}</p>
  </header>

  <section>
    <h2 style="margin-top:0">Сигналы</h2>
    <ul class="signals">{signals}</ul>
  </section>

  <section>
    <h2 style="margin-top:0">Итоги периода</h2>
    <div class="tiles">{tiles}</div>
    <h3>Визиты по дням</h3>
    {visits_chart}
  </section>

  <section>
    <h2 style="margin-top:0">Поиск</h2>
    <h3>Страниц в поиске Яндекса</h3>
    {index_chart}
    <div class="two">
      <div>
        <h3>Запросы — Яндекс</h3>
        {wm_table}
      </div>
      <div>
        <h3>Запросы — Google</h3>
        {gsc_table}
      </div>
    </div>
    <h3>Поисковые фразы по данным Метрики</h3>
    {phrases_table}
  </section>

  <section>
    <h2 style="margin-top:0">Трафик</h2>
    <h3>Страницы входа</h3>
    {pages_table}
    <div class="two">
      <div>
        <h3>Источники</h3>
        {sources_table}
      </div>
      <div>
        <h3>Устройства</h3>
        {devices_table}
      </div>
    </div>
  </section>

  <section>
    <h2 style="margin-top:0">Целевые действия</h2>
    {goals_table}
  </section>

  <section>
    <h2 style="margin-top:0">Продукт</h2>
    {product}
  </section>

  <footer>
    Пересобрать: <code>python -X utf8 scripts/analytics_pull.py</code>, затем
    <code>python -X utf8 scripts/analytics_report.py</code>.
    Снимки — в <code>docs/analytics/data/</code>. © {year}
  </footer>
</main>
</body>
</html>
"""


def main():
    if not DATA.exists():
        print(f"Нет снимка: {DATA}\nСначала: python -X utf8 scripts/analytics_pull.py", file=sys.stderr)
        return 2
    data = json.loads(DATA.read_text(encoding="utf-8"))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render(data), encoding="utf-8")
    print(f"Отчёт: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
