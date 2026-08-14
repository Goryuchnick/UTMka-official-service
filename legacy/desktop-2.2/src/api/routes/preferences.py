"""
Маршруты для пользовательских настроек (preferences)
"""
import json
from pathlib import Path
from flask import Blueprint, request, jsonify
from src.core.config import get_data_dir

preferences_bp = Blueprint('preferences', __name__, url_prefix='/api')

DEFAULTS = {
    'theme': 'dark',
    'lang': 'ru',
    'onboarding_done': False
}


def _get_prefs_path() -> Path:
    return get_data_dir() / 'preferences.json'


def _read_prefs() -> dict:
    path = _get_prefs_path()
    if path.exists():
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return {**DEFAULTS, **data}
        except (json.JSONDecodeError, IOError):
            return dict(DEFAULTS)
    return dict(DEFAULTS)


def _write_prefs(prefs: dict):
    path = _get_prefs_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(prefs, f, ensure_ascii=False, indent=2)


@preferences_bp.route('/preferences', methods=['GET'])
def get_preferences():
    """Возвращает все пользовательские настройки"""
    return jsonify(_read_prefs())


@preferences_bp.route('/preferences', methods=['POST'])
def set_preferences():
    """Обновляет настройки (partial update)"""
    data = request.json or {}
    current = _read_prefs()
    for key in DEFAULTS:
        if key in data:
            current[key] = data[key]
    _write_prefs(current)
    return jsonify(current)
