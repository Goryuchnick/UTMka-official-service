# -*- coding: utf-8 -*-
"""
Сверка целей Метрики со списком событий в коде.

Зачем скриптом, а не руками в панели. Цель в Метрике и вызов `track()` в
экране — одно понятие в двух местах, и расходятся они молча: переименовали
событие в коде — цель осталась ловить старое имя и просто перестала
достигаться. Ни ошибки, ни пустого отчёта — просто ноль, который легко
принять за «людям не нужно». Скрипт читает `packages/core/src/track.ts` и
приводит панель в соответствие с кодом.

Что делает:

* заводит недостающие цели (тип `action` — достижение по `reachGoal`);
* переименовывает те, у которых разъехалось человеческое имя;
* сообщает о лишних целях, но НЕ удаляет их — за удалением цели уходит вся её
  история достижений, и решение об этом принимает владелец, а не скрипт.

Запуск:
    python -X utf8 scripts/analytics_goals.py            # показать разницу
    python -X utf8 scripts/analytics_goals.py --apply    # применить
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import analytics_env as env

API = "https://api-metrika.yandex.net/management/v1/counter"


def existing_goals(token):
    """Цели счётчика. Автоцели Метрики (`goal_source == 'auto'`) не наши: их
    заводит сама панель, и трогать их скрипт не имеет права."""
    data = env.request(
        f"{API}/{env.COUNTER_ID}/goals",
        headers={"Authorization": f"OAuth {token}"},
    )
    if "__error__" in data:
        raise env.Missing(f"Метрика не отдала цели: {data['__error__']} {data.get('detail', '')}")
    return data.get("goals", [])


def goal_key(goal):
    """Идентификатор события внутри цели — то, что летит в `reachGoal`."""
    for condition in goal.get("conditions", []):
        if condition.get("type") == "exact":
            return condition.get("url", "")
    return ""


def plan(token):
    """Что нужно сделать, чтобы панель совпала с кодом."""
    wanted = env.track_events()
    goals = existing_goals(token)
    mine = {goal_key(g): g for g in goals if g.get("goal_source") != "auto" and goal_key(g)}

    create = [(k, name) for k, name in wanted.items() if k not in mine]
    rename = [
        (k, mine[k], name)
        for k, name in wanted.items()
        if k in mine and mine[k].get("name") != name
    ]
    extra = [g for k, g in mine.items() if k not in wanted]
    return create, rename, extra, goals


def create_goal(token, key, name):
    """Цель типа «событие»: условие `exact` по имени, которое шлёт `track()`."""
    body = {
        "goal": {
            "name": name,
            "type": "action",
            "is_retargeting": 0,
            "conditions": [{"type": "exact", "url": key}],
        }
    }
    return env.request(
        f"{API}/{env.COUNTER_ID}/goals",
        headers={"Authorization": f"OAuth {token}"},
        method="POST",
        body=body,
    )


def rename_goal(token, goal, name):
    """Переименование. Цель та же — меняется только подпись в отчётах,
    история достижений остаётся при ней."""
    body = {"goal": dict(goal)}
    body["goal"]["name"] = name
    return env.request(
        f"{API}/{env.COUNTER_ID}/goal/{goal['id']}",
        headers={"Authorization": f"OAuth {token}"},
        method="PUT",
        body=body,
    )


def main():
    apply = "--apply" in sys.argv
    token, _ = env.yandex_tokens()
    create, rename, extra, goals = plan(token)

    print(f"Счётчик {env.COUNTER_ID}: целей сейчас {len(goals)}")
    for key, name in create:
        print(f"  + завести  {key:<20} «{name}»")
    for key, goal, name in rename:
        print(f"  ~ имя      {key:<20} «{goal.get('name')}» → «{name}»")
    for goal in extra:
        print(f"  ? лишняя   {goal_key(goal):<20} «{goal.get('name')}» (id {goal.get('id')}) — не трогаю")
    if not create and not rename:
        print("  всё совпадает с кодом")
        return 0

    if not apply:
        print("\nЭто предпросмотр. Применить: python -X utf8 scripts/analytics_goals.py --apply")
        return 0

    for key, name in create:
        answer = create_goal(token, key, name)
        status = answer.get("__error__") or f"id {answer.get('goal', {}).get('id')}"
        print(f"  завёл {key}: {status}")
    for key, goal, name in rename:
        answer = rename_goal(token, goal, name)
        print(f"  переименовал {key}: {answer.get('__error__') or 'ок'}")

    # Сверка после записи: панель могла принять запрос и не сделать ничего.
    left, renamed_left, _, _ = plan(token)
    if left or renamed_left:
        print("\n⚠️ После применения всё ещё есть расхождения:")
        print(json.dumps({"создать": left, "переименовать": len(renamed_left)}, ensure_ascii=False))
        return 1
    print("\nГотово: панель совпадает с кодом.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except env.Missing as error:
        print(f"Нет доступа:\n{error}", file=sys.stderr)
        sys.exit(2)
