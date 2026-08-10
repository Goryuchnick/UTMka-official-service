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
    """Отдает favicon (legacy PNG для .ico-запросов браузера)."""
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


@main_bp.route('/logo/<path:filename>')
def logo_asset(filename: str):
    """Отдаёт файлы из папки logo/ в корне проекта (SVG-лого, favicon, PNG)."""
    try:
        # безопасность: не даём выйти из папки logo
        if '..' in filename or filename.startswith('/') or filename.startswith('\\'):
            return Response(status=404)
        logo_path = resource_path(os.path.join('logo', filename))
        if not os.path.exists(logo_path):
            return Response(status=404)
        ext = filename.lower().rsplit('.', 1)[-1]
        mime = {
            'svg': 'image/svg+xml',
            'png': 'image/png',
            'ico': 'image/x-icon',
            'icns': 'image/x-icns',
        }.get(ext, 'application/octet-stream')
        response = send_file(logo_path, mimetype=mime)
        response.cache_control.max_age = 3600
        response.cache_control.public = True
        return response
    except Exception:
        return Response(status=404)


@main_bp.route('/api/version')
def get_version():
    """Возвращает текущую версию приложения."""
    return jsonify({'version': __version__})
