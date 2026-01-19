"""
Главные роуты - отдача фронтенда
"""
from flask import Blueprint, render_template, send_from_directory
import os

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Главная страница - отдаёт index.html"""
    return render_template('index.html')


@main_bp.route('/static/<path:filename>')
def static_files(filename):
    """Отдача статических файлов"""
    static_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
    return send_from_directory(static_folder, filename)
