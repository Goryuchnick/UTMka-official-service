"""
Маршруты аутентификации (заготовка для Web версии)

В Desktop версии все эндпоинты возвращают 501 Not Implemented.
Реализация будет добавлена при запуске Web версии.
"""
from flask import Blueprint, jsonify

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """Email + password login"""
    return jsonify({'error': 'Not implemented for desktop'}), 501


@auth_bp.route('/oauth/google', methods=['POST'])
def google_oauth():
    """Google OAuth callback"""
    return jsonify({'error': 'Not implemented for desktop'}), 501


@auth_bp.route('/oauth/yandex', methods=['POST'])
def yandex_oauth():
    """Yandex OAuth callback"""
    return jsonify({'error': 'Not implemented for desktop'}), 501


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Получить текущего пользователя"""
    return jsonify({'error': 'Not implemented for desktop'}), 501
