"""
Основные маршруты приложения
"""
import os
import sys
from flask import Blueprint, render_template, make_response, send_file, Response, jsonify
from src.core.version import __version__

main_bp = Blueprint('main', __name__)


def resource_path(relative_path: str) -> str:
    """Путь к ресурсам (работает и в dev, и в PyInstaller)"""
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    return os.path.join(base_path, relative_path)


@main_bp.route('/')
def index():
    """Отдает главный HTML файл."""
    response = make_response(render_template('index.html'))
    response.headers['X-Favicon'] = 'none'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@main_bp.route('/favicon.ico')
def favicon():
    """Отдает favicon."""
    try:
        favicon_path = resource_path('logo/logoutm.png')
        if not os.path.exists(favicon_path):
            return Response(status=204)

        response = send_file(favicon_path, mimetype='image/png')
        response.cache_control.max_age = 31536000
        response.cache_control.public = True
        return response
    except Exception:
        return Response(status=204)


@main_bp.route('/api/version')
def get_version():
    """Возвращает текущую версию приложения."""
    return jsonify({'version': __version__})
